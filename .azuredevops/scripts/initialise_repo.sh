#!/usr/bin/env bash
# Generate only into a new repository. Template checkouts are read-only inputs.
set -euo pipefail

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -ge 5 && $# -le 6 ]] || fail 'Expected target, project type, ML interface, template, infrastructure, and optional layout.'
repo_name=$1
project_type=$2
mlops_version=$3
template_repo=$4
infrastructure_version=$5
template_layout=${6:-accelerator}

case "$project_type" in classical|cv|nlp) ;; *) fail 'Unsupported project type.' ;; esac
case "$mlops_version" in aml-cli-v2|python-sdk-v2|rai-aml-cli-v2) ;; *) fail 'Unsupported ML interface.' ;; esac
case "$infrastructure_version" in bicep|terraform) ;; *) fail 'Unsupported infrastructure provider.' ;; esac
case "$template_layout" in standalone|accelerator) ;; *) fail 'Unsupported template layout.' ;; esac

[[ -d "$template_repo" && -d "$repo_name" ]] || fail 'Template and target checkout directories must exist.'
template_repo=$(cd -- "$template_repo" && pwd -P)
repo_name=$(cd -- "$repo_name" && pwd -P)
[[ "$repo_name/" != "$template_repo/"* && "$template_repo/" != "$repo_name/"* ]] || fail 'Template and target must be separate, non-nested directories.'
[[ -d "$repo_name/.git" ]] || fail 'Target must be a separate Git checkout, not a subdirectory or linked worktree.'

# Refuse working applications, uncommitted edits, and previously used repositories.
# Azure Repos creates a one-commit README repository, often checked out detached.
[[ "$(git -C "$repo_name" rev-parse --is-shallow-repository)" == 'false' ]] || fail 'Target history is shallow; use fetchDepth: 0 before validating a new repository.'
[[ -z "$(git --no-optional-locks -C "$repo_name" status --porcelain --untracked-files=all)" ]] || fail 'Target has uncommitted changes; use a new repository.'
shopt -s nullglob dotglob
for entry in "$repo_name"/*; do
  name=${entry##*/}
  [[ "$name" == '.git' ]] && continue
  case "$name" in
    README|README.md|LICENSE|LICENSE.md|.gitignore|.gitattributes)
      [[ -f "$entry" && ! -L "$entry" ]] || fail 'Target contains non-placeholder content.' ;;
    *) fail "Target already contains '$name'; use a new repository, never your working project." ;;
  esac
done
if git -C "$repo_name" rev-parse --verify HEAD >/dev/null 2>&1; then
  [[ "$(git -C "$repo_name" rev-list --count HEAD)" -le 1 ]] || fail 'Target has existing history; use a new repository.'
  if git -C "$repo_name" show-ref --verify --quiet refs/heads/main; then
    [[ "$(git -C "$repo_name" rev-parse HEAD)" == "$(git -C "$repo_name" rev-parse refs/heads/main)" ]] || fail 'Target checkout is not the initial main commit.'
  fi
fi
git -C "$repo_name" remote get-url origin >/dev/null || fail 'Target needs an origin remote.'

for config in config-infra-dev.yml config-infra-prod.yml; do
  [[ -f "$template_repo/$config" ]] || fail "Template is missing $config."
done

if [[ "$template_layout" == 'standalone' ]]; then
  [[ "$project_type/$mlops_version/$infrastructure_version" == 'classical/aml-cli-v2/bicep' ]] || fail 'Standalone taxi supports only classical / aml-cli-v2 / bicep.'
  [[ -f "$template_repo/template-manifest.json" ]] || fail 'Standalone taxi template manifest is missing.'
  for directory in data data-science mlops infrastructure tests; do
    [[ -d "$template_repo/$directory" ]] || fail "Standalone taxi template is missing $directory."
  done
else
  project_root="$template_repo/$project_type/$mlops_version"
  [[ -d "$template_repo/infrastructure/$infrastructure_version" ]] || fail 'Selected infrastructure template does not exist.'
  for directory in data data-science mlops; do
    [[ -d "$project_root/$directory" ]] || fail "Selected project template is missing $directory."
  done
fi

# Stage the whole copy before touching the target. Never move/delete source files.
staging=$(mktemp -d)
trap 'rm -rf -- "$staging"' EXIT
if [[ "$template_layout" == 'standalone' ]]; then
  for entry in "$template_repo"/*; do
    # Preserve the template checkout, but do not seed source-control or retired assistant metadata.
    case "${entry##*/}" in .git|.opencode) continue ;; esac
    cp -R -- "$entry" "$staging/"
  done
else
  cp -R -- "$template_repo/infrastructure/$infrastructure_version" "$staging/infrastructure"
  for directory in data data-science mlops; do
    cp -R -- "$project_root/$directory" "$staging/$directory"
  done
  cp -- "$template_repo/config-infra-dev.yml" "$template_repo/config-infra-prod.yml" "$staging/"
  if [[ -f "$project_root/config-aml.yml" ]]; then
    cp -- "$project_root/config-aml.yml" "$staging/"
  fi
  rm -rf -- "$staging/mlops/github-actions"
fi

if git -C "$repo_name" show-ref --verify --quiet refs/heads/main; then
  git -C "$repo_name" checkout main
else
  git -C "$repo_name" checkout -b main
fi
for entry in "$repo_name"/*; do
  [[ "${entry##*/}" == '.git' ]] && continue
  rm -f -- "$entry"
done
cp -R -- "$staging/." "$repo_name/"
git -C "$repo_name" add --all
git -C "$repo_name" diff --cached --quiet && fail 'No generated files were staged.'

# Command-local identity: no global Git configuration or credential/remote output.
git -C "$repo_name" -c user.email=hosted.agent@dev.azure.com -c user.name='Azure Pipeline' commit -m 'Initialize ML project from template'
git -C "$repo_name" push --set-upstream origin main

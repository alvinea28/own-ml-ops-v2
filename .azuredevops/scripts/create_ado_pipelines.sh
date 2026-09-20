#!/usr/bin/env bash
set -euo pipefail

[[ $# -ge 2 && $# -le 3 ]] || { echo 'Expected repository name, project name, and optional checkout directory.' >&2; exit 1; }
repo_name=$1
project_name=$2
repo_directory=${3:-$repo_name}
cd -- "$repo_directory"

project_args=(--project "$project_name")
if [[ -n "${SYSTEM_COLLECTIONURI:-}" ]]; then
    project_args+=(--organization "$SYSTEM_COLLECTIONURI")
fi

# Preserve the hosted agent queue selection; a CLI failure must not look successful.
agent_pool_name=${AGENT_POOL_NAME:-Azure Pipelines}
queue_id=$(az pipelines queue list "${project_args[@]}" \
    --query "[?name=='$agent_pool_name'].id | [0]" -o tsv)
queue_args=()
if [[ -n "$queue_id" ]]; then
    queue_args=(--queue-id "$queue_id")
else
    echo "WARNING: No queue ID for '$agent_pool_name'; first run may require pool selection." >&2
fi

az pipelines folder create --path "$repo_name" "${project_args[@]}"
for category in mlops infrastructure; do
    az pipelines folder create --path "$repo_name/$category" "${project_args[@]}"
done

# Only top-level YAML entry points are pipelines. In particular, never register
# the taxi project's templates/ directory or require-success.yml as a pipeline.
shopt -s nullglob
for category in mlops infrastructure; do
    if [[ "$category" == 'mlops' ]]; then
        pipeline_directory=mlops/devops-pipelines
    else
        pipeline_directory=infrastructure/pipelines
    fi
    files=("$pipeline_directory"/*.yml "$pipeline_directory"/*.yaml)
    [[ ${#files[@]} -gt 0 ]] || { echo "No pipeline YAML files in $pipeline_directory." >&2; exit 1; }
    for file in "${files[@]}"; do
        [[ -f "$file" ]] || continue
        name=${file##*/}
        az pipelines create \
            --name "${name%.*}" \
            --detect true \
            --description "Automatically created pipeline for $category $name" \
            --repository "$repo_name" \
            --branch main \
            --yml-path "$file" \
            "${project_args[@]}" \
            --repository-type tfsgit \
            --skip-first-run true \
            --folder-path "$repo_name/$category" \
            "${queue_args[@]}"
    done
done

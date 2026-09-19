# Personal copy and upstream study

Inspected on **2026-09-19**. Scope: inspect, clone, and publish a personal copy only; do not bootstrap an ML project or deploy Azure resources.

## Provenance and ownership

| Item | Verified value |
| --- | --- |
| Personal repository | https://github.com/alvinea28/own-ml-ops-v2 |
| Owner | `alvinea28`, a GitHub user account, not an organization |
| Visibility / relationship | Private, independent repository; not a GitHub fork |
| Working and default branch | `dev` |
| Upstream | https://github.com/Azure/mlops-v2 |
| Inspected upstream branch | `main` |
| Inspected commit | [85fe72214bf5f9c9064984c00dc818c046599215](https://github.com/Azure/mlops-v2/commit/85fe72214bf5f9c9064984c00dc818c046599215) |
| Original files / history | 134 tracked files; all 119 commits reachable from the inspected upstream head |
| License | [../LICENSE](../LICENSE), MIT; Microsoft copyright and license retained |

All original files are retained without intentional edits. Personal additions are this study, the daily report, a small repository knowledge map, and scoped [../.gitattributes](../.gitattributes) rules for those additions. This is a personal copy, not a Microsoft-endorsed project.

The local `origin` fetch/push remote points to the personal repository. The local `upstream` fetch remote points to Azure's repository, but its push URL is disabled. `remote.pushDefault` is `origin`; the checked-out `dev` branch tracks `origin/dev`. Automatic line-ending conversion is disabled for the upstream files in this clone; the scoped attributes normalize only personal additions to LF in Git. Global Git settings and existing commit-author settings are unchanged.

Only `dev` is published to the personal repository. The upstream release tags and other upstream branch refs were fetched locally, but are not mirrored to the personal remote. Issues, pull requests, release assets, repository settings, and the two companion repositories are not copied by this operation.

## What this repository actually contains

This is the **bootstrap and documentation layer**, not a complete runnable ML application. The [repository structure guide](../documentation/structure/README.md) describes three separate repositories:

| Repository | Role | Copied here? |
| --- | --- | --- |
| [Azure/mlops-v2](https://github.com/Azure/mlops-v2) | Project initialization scripts, an Azure DevOps initialization pipeline, architecture and deployment guides | Yes |
| [Azure/mlops-project-template](https://github.com/Azure/mlops-project-template) | Scenario-specific data-science/project scaffolding and infrastructure choices | No |
| [Azure/mlops-templates](https://github.com/Azure/mlops-templates) | Reusable ML pipeline/action implementations and helpers | No |

The inspected tree has three shell scripts, one Azure DevOps initialization pipeline, documentation, images, and GitHub issue/PR templates. It has **no GitHub Actions workflows, application test suite, ML training implementation, or deployable infrastructure templates of its own**. Companion-repository implementation and current compatibility were not audited in this task.

## Architectural model

The [architecture overview](../documentation/architecture/README.md) separates the lifecycle into data estate, administration/setup, model development, and model deployment:

1. **Setup:** establish repositories, workspaces, identities, access, compute, and CI/CD.
2. **Inner loop:** data preparation, experimentation, training, evaluation, and candidate-model registration.
3. **Outer loop:** staging/testing, approval gates, deployment, and operational monitoring.
4. **Serving:** documented options include managed batch endpoints, managed online endpoints, and Kubernetes/Arc patterns.
5. **Feedback:** monitoring can return work to model development or infrastructure setup. These are design patterns, not deployed capabilities in this copy.

[Classical ML](../documentation/architecture/classical.md) is the baseline tabular-data pattern. [Computer vision](../documentation/architecture/vision.md) adds image annotation and human review of new difficult images. [NLP](../documentation/architecture/nlp.md) adds text annotation, tokenization, normalization, and embeddings. The CV/NLP guidance emphasizes human review before retraining on newly problematic data.

## Configuration choices for a later project

| Dimension | Choices advertised in the inspected source |
| --- | --- |
| Infrastructure | Bicep or Terraform |
| Workload | `classical`, `cv`, or `nlp` |
| Azure ML interface | The ADO initializer offers `aml-cli-v2`, `python-sdk-v2`, or `rai-aml-cli-v2` |
| Orchestration | GitHub Actions or Azure DevOps |
| Repository owner | The GitHub guide explicitly allows a GitHub username instead of an organization |

The standalone script also lists legacy `python-sdk-v1` in a comment. Advertised choices do not prove that every combination works. The [GitHub guide](../documentation/deployguides/deployguide_gha.md) lists classical pipelines as supported, whereas the [ADO guide](../documentation/deployguides/deployguide_ado.md) documents a broader scenario/interface matrix. Check the actual companion templates before selecting a combination.

## Entry points and why they were not executed

| Entry point | Observed behavior |
| --- | --- |
| [../sparse_checkout.sh](../sparse_checkout.sh) | Sparse-clones the project-template repository, moves/deletes selected directories, removes the generated project's Git metadata, creates a private GitHub repository, commits, and pushes to `main` via SSH |
| [../.azuredevops/initialise-project.yml](../.azuredevops/initialise-project.yml) | Manual initialization pipeline (`trigger: none`); checks out template/target repositories and invokes the two ADO scripts on an Ubuntu agent |
| [../.azuredevops/scripts/initialise_repo.sh](../.azuredevops/scripts/initialise_repo.sh) | Validates source directories, changes global Git author settings in its execution environment, clears the target working tree except its Git metadata, copies scaffolding, commits, and pushes to `main` |
| [../.azuredevops/scripts/create_ado_pipelines.sh](../.azuredevops/scripts/create_ado_pipelines.sh) | Resolves an agent queue and creates Azure DevOps folders and pipelines; passes `--skip-first-run true` to pipeline creation |

These are **mutating bootstrap tools**, not clone or inspection commands. None was run. Shell validation used `bash -n` only.

## Concerns to address before any future bootstrap

- **Personal-account routing:** the standalone script defaults `github_org_name` to `orgname`. A future generated project would need an explicit personal owner and a distinct target repository; do not point its destructive initialization at this study copy.
- **Windows paths and failure handling:** the standalone script contains unquoted path expansions, including `cd $git_folder_location`, and lacks fail-fast settings. This workspace path contains spaces. The ADO pipeline-creation script also has unquoted arguments and lacks fail-fast settings. Syntax checks do not validate these runtime behaviors.
- **Branch assumptions:** bootstrap scripts push `main`; this personal copy uses `dev`. Review branch and environment mappings before reusing any automation.
- **External template drift:** the standalone script clones the companion's moving `main` branch, not an immutable commit. Record or pin the companion versions before a reproducible deployment.
- **Authentication and permissions:** the GitHub guide already documents OIDC federation. No credentials, app registrations, secrets, or role assignments were configured here. Its subscription-wide Contributor example should be reviewed for least privilege rather than copied automatically.
- **Deployment defaults are not readiness evidence:** the guide describes a potentially large compute cluster and optional private endpoints disabled by default. Review actual template versions, cost, quota, network policy, and permissions before deployment. Some configuration examples mix YAML-style and Terraform-style assignments; validate the real files rather than pasting examples blindly.

## Validation and scope limits

- All three shell scripts passed non-executing Bash syntax checks.
- The original 134-file tree and 119-commit ancestry were preserved; Git object-integrity validation passed.
- The unchanged baseline was published to the personal `dev` branch and its exact commit verified through the authenticated GitHub API.
- No application build, ML training, inference, integration, or Azure deployment tests were run. This repository does not supply an application test suite.
- No Azure or Azure DevOps resources were created, and no bootstrap or deployment workflows were triggered.

The next phase, only if requested, is to choose the workload/orchestrator/infrastructure approach and inspect the two companion repositories before creating an actual ML project.

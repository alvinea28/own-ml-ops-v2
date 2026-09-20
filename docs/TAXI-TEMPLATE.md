# Initialize from the repaired standalone taxi repository

The personal accelerator now selects
[alvinea28/taxi-fare-regression](https://github.com/alvinea28/taxi-fare-regression)
for **classical + AML CLI v2 + Bicep** by default. It is a clean snapshot of the
working project, rather than an overlay applied to the older upstream template.
The original working repository is not changed.

Full walkthrough: [Azure DevOps guide (Markdown)](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.md)
or [Azure DevOps guide (PDF)](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.pdf).
These links select `main` explicitly; older `dev` links do not contain the latest guide and PDF.

## Template source versus generated project

The imported taxi repository is **not the new application you are trying to
generate**. It is the reusable source containing the working fixes. Import that
source once as **`taxi-fare-regression-template`**. Separately create a new empty
Azure Repos repository, for example **`taxi-fare-regression-demo`**.

The initialization YAML checks out both repositories, copies the template files
into the empty target, commits and pushes the generated project, and creates its
pipeline definitions. It does not create the Azure Repos repository itself: that
empty target must exist before checkout. Never use the source template or your
existing working application as the target.

Only these two personal GitHub copies were created for this workflow:

- [alvinea28/own-ml-ops-v2](https://github.com/alvinea28/own-ml-ops-v2): the initializer and documentation.
- [alvinea28/taxi-fare-regression](https://github.com/alvinea28/taxi-fare-regression): the repaired standalone source template.

The remaining `Azure/...` URLs below are real upstream dependencies, **not** copies
in the personal GitHub account. `Azure/mlops-templates` is still required by the
generated training and deployment pipelines. `Azure/mlops-project-template` is
only needed for other scenario selections or the upstream opt-out; the standalone
taxi template replaces it for classical / AML CLI v2 / Bicep.

Copying a dependency into a personal GitHub account would change its source URL,
but would not remove the Azure Repos import step: this initializer currently uses
Azure Repos `git://` checkouts, not direct GitHub checkouts. No additional personal
copies of the upstream companion repositories have been created.

## Import the repositories into Azure DevOps

Keep the original guide's Azure Repos import model. The initializer does not
anonymously clone a private GitHub repository or require credentials in YAML.

| GitHub source | Azure Repos name | Branch | Purpose |
| --- | --- | --- | --- |
| [own-ml-ops-v2](https://github.com/alvinea28/own-ml-ops-v2) | `own-ml-ops-v2` (or an existing accelerator name) | **`main`** | Updated initialization pipeline and scripts |
| [taxi-fare-regression](https://github.com/alvinea28/taxi-fare-regression) | **`taxi-fare-regression-template`** | `main` | Repaired standalone taxi source |
| [Azure/mlops-templates](https://github.com/Azure/mlops-templates) | `mlops-templates` | `main` | Shared Azure ML CLI pipeline helpers |
| [Azure/mlops-project-template](https://github.com/Azure/mlops-project-template) | `mlops-project-template` | `main` | Only needed for other scenarios or the upstream opt-out |

Repository visibility is controlled separately on GitHub. Grant readers access to
private repositories, including the taxi template, and authenticate their import
in the Azure DevOps UI. Never copy an import PAT into a pipeline, shell script,
README, or chat. Imports are **not automatic mirrors**:
bring later GitHub commits into Azure Repos deliberately before generating a new
project. Existing generated applications are not automatically overwritten.

Use the distinct template name above even if your existing application is named
`taxi-fare-regression`. Do not repurpose that working application as a target.

## Run initialization

1. Create a **new** Azure Repos application repository, for example
   `taxi-fare-regression-demo`. A one-commit README repository on `main` is supported.
2. Give the project Build Service read access to the source repositories and
   contribute/create-branch permissions on this **new target only**, plus the
   pipeline-creation permissions from the original deployment guide.
3. Create or edit the initialization pipeline to use the accelerator's **main**
   branch and [.azuredevops/initialise-project.yml](../.azuredevops/initialise-project.yml).
   The personal repository's `main` branch now contains all repaired accelerator
   code and is its GitHub default. If already imported into Azure Repos, first
   synchronize/import this updated `main`, then manually select `main` in the
   pipeline's branch selector. Changing the GitHub default does not update an
   existing Azure Repos import or a saved pipeline's branch automatically.
4. Set the Azure DevOps project and new target repository names. Keep these values:
   - `useRepairedTaxiTemplate`: `true`
   - `taxiTemplateRepoName`: `taxi-fare-regression-template`
   - `projectType`: `classical`
   - `mlopsVersion`: `aml-cli-v2`
   - `infrastructure_version`: `bicep`
5. Authorize the checked-out repositories when Azure DevOps asks. The target's
   persisted pipeline credential is used only to push its initial generated commit.

The pipeline copies the standalone root, including tests, docs, configuration,
data, infrastructure, and hidden project configuration. It does **not** copy the
template's Git history. Source checkouts are never moved or deleted. Fixed checkout
paths mean the accelerator's Azure Repos name can differ from its GitHub name; the
old `mlopsRepoName` path parameter is no longer necessary.

Initialization fetches full target history and refuses shallow checkouts, dirty
targets, targets with application files, targets with more than one existing
commit, and overlapping source/target directories. It is a new-project generator,
**not an updater for a working application**. No force push or global Git
configuration is used.

The four copied pipeline entry points are then registered with their first run
disabled. The local `mlops/devops-pipelines/templates/` directory is a reusable
step-template folder, not another pipeline, and is deliberately excluded.

## Other variants and rollback

CV, NLP, Python SDK v2, Responsible AI, or Terraform selections keep using the
original nested `mlops-project-template` layout. Setting
`useRepairedTaxiTemplate: false` also restores that source for the taxi scenario.
Import the upstream template repo before using those selections. These options
retain upstream behavior; they are not covered by the taxi runtime fixes.

The taxi source is checked out from its imported `main` branch. For repeatable
rollouts, review and control that branch's revision before running initialization.
Switching sources affects **future** generated repositories only.

## Before running the generated pipelines

Read the [taxi project's README](https://github.com/alvinea28/taxi-fare-regression/blob/main/README.md).
Use your own resource postfix, region, workload-federated Azure service connections,
and Azure ML quotas. The copied example settings do not deploy into the original
owner's environment.

The working project's Azure-side state is not part of a Git snapshot: notably,
configure a compute managed identity and registry-scoped `AcrPull` if private ACR
image pulls require them. The copied Bicep compute module does not declare that
identity/RBAC repair. The new repository documents this prerequisite explicitly;
local tests do not certify a fresh Azure deployment.

## Offline verification

Run the built-in Node test runner (Node 18+, Git and Bash required):

```text
node --test .azuredevops/tests/initialise-project.test.cjs
```

The suite uses only disposable local Git repositories and a fake Azure CLI. It
checks standalone generation, byte-preserved inputs, existing-project protection,
upstream layout fallback, and correct pipeline discovery/error propagation.

For the real-snapshot integration test, set `TAXI_TEMPLATE_ROOT` to a clean local
checkout of the new taxi repository. Set `TAXI_TEST_PYTHON` to a separate Python
3.11 interpreter with that repository's test requirements installed. This
generates a disposable taxi project and runs its 34 Node and 18 Python regressions.
Azure CLI is required for the copied Node suite's isolated, offline config checks.
Without these optional environment variables, those runtime checks are not claimed.

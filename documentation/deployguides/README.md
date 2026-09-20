# Getting Started

## Deploying the Solution Accelerator

The current guides are published in [alvinea28/own-ml-ops-v2 on main](https://github.com/alvinea28/own-ml-ops-v2/tree/main). Use these links rather than an older `dev`-branch URL.

* [Azure DevOps guide (Markdown)](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.md)
* [Azure DevOps guide (PDF, 36 pages)](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.pdf)
* [Personal taxi-template setup](https://github.com/alvinea28/own-ml-ops-v2/blob/main/docs/TAXI-TEMPLATE.md)
* [Import the repaired taxi template: exact URL and steps](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.md#import-the-taxi-regression-template)
* [ESv3 compute sizes and quota budget](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.md#esv3-compute-sizes-and-quota-budget)
* [Before training: managed identities and ACR permissions](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.md#before-training-managed-identities-and-container-registry-access)
* [GitHub Workflows guide](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_gha.md)

The PDF was added in [commit 63fec2f](https://github.com/alvinea28/own-ml-ops-v2/commit/63fec2ffa23c86ecf7493a497b97270710fc8f29) and is stored beside its Markdown source in this directory. Both guides use the personal accelerator URL; Microsoft Learn and genuine upstream dependency links remain unchanged.

**Why import the taxi repository?** It supplies the reusable source template;
the initializer populates a different, new application repository. The personal
copy has not duplicated the upstream `mlops-templates` or `mlops-project-template`
repositories. See [what is imported and what the initializer creates](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.md#what-is-imported-and-what-does-the-initializer-create)
for the exact import roles and required dependencies.

The standard taxi initializer now has **three inputs only**: Azure DevOps project,
new target repository, and imported taxi source. Optional upstream choices are
available in a [separate advanced initializer](../../.azuredevops/initialise-project-advanced.yml),
not as unused fields in the taxi run form.

Before queueing, use the [repository existence checklist](deployguide_ado.md#check-the-repositories-before-running-initialization).
If Azure DevOps reports that the source could not be retrieved, follow the
[source-access troubleshooting steps](deployguide_ado.md#the-repository-taxi-fare-regression-template-could-not-be-retrieved).

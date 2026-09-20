# Getting Started

## Deploying the Solution Accelerator

The current guides are published in [alvinea28/own-ml-ops-v2 on main](https://github.com/alvinea28/own-ml-ops-v2/tree/main). Use these links rather than an older `dev`-branch URL.

* [Azure DevOps guide (Markdown)](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.md)
* [Azure DevOps guide (PDF, 33 pages)](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.pdf)
* [Personal taxi-template setup](https://github.com/alvinea28/own-ml-ops-v2/blob/main/docs/TAXI-TEMPLATE.md)
* [GitHub Workflows guide](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_gha.md)

The PDF was added in [commit 63fec2f](https://github.com/alvinea28/own-ml-ops-v2/commit/63fec2ffa23c86ecf7493a497b97270710fc8f29) and is stored beside its Markdown source in this directory. Both guides use the personal accelerator URL; Microsoft Learn and genuine upstream dependency links remain unchanged.

**Why import the taxi repository?** It supplies the reusable source template;
the initializer populates a different, new application repository. The personal
copy has not duplicated the upstream `mlops-templates` or `mlops-project-template`
repositories. See [what is imported and what the initializer creates](https://github.com/alvinea28/own-ml-ops-v2/blob/main/documentation/deployguides/deployguide_ado.md#what-is-imported-and-what-does-the-initializer-create)
for the exact import roles and required dependencies.

# MLOps workshop lab drafts

**Instructor review edition - 20 September 2026**

These two exercises follow the existing deployment/setup guide. They assume each
participant already has a working, assigned workshop workspace and online
endpoint, with the generated application repository cloned in VS Code.

## Lab 1: code to endpoint

Change model code, configure push-to-training and training-to-deployment triggers,
commit and push, inspect the accepted model, and test the existing endpoint.

- PDF, **3 pages**: [lab-01-code-to-endpoint-draft.pdf](lab-01-code-to-endpoint-draft.pdf)
- Editable source: [lab-01-code-to-endpoint-draft.md](lab-01-code-to-endpoint-draft.md)

## Lab 2: data to endpoint

After Lab 1 succeeds, simulate a 20% fare increase in the training CSV, commit and
push, follow data/model version lineage, and compare endpoint predictions.

- PDF, **2 pages**: [lab-02-data-to-endpoint-draft.pdf](lab-02-data-to-endpoint-draft.pdf)
- Editable source: [lab-02-data-to-endpoint-draft.md](lab-02-data-to-endpoint-draft.md)

## Review status and safety

- **Drafts only, not live-tested.** The instructor must pilot the exercises before
  distributing them. Example syntax and document output were checked; no lab
  training, deployment, or endpoint invocation was executed while preparing them.
- The PDFs remain separate from the existing setup guide and match the reviewed
  standalone draft exports. Only Markdown line-break notation was normalized for
  Git; the instructions and code examples are unchanged.
- The proposed CI changes are instructions, not changes applied to this
  repository's pipelines or the taxi application's source.
- Run serially in an assigned sandbox. A rejected candidate may leave the old
  model deployed; a green training run is not proof that a new model was promoted.
- No infrastructure creation, resizing, deletion, permissions changes, or secret
  copying is part of these labs. Existing online compute remains billable.

For the setup reference, see
[../deployguides/deployguide_ado.md](../deployguides/deployguide_ado.md).

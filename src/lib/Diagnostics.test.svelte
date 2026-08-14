<script lang="ts">
  import { Sweater } from "../../sweater-vest-suede";
  import { Editor, DiagnosticFilter } from "../../release/index";
  import type { EditableFile } from "../../release/models.svelte";
  import { uri } from "../../release/workspace";

  class Pocket {
    file = $state<EditableFile>()!;
    constructor(file: EditableFile) {
      this.file = file;
    }
  }

  /** A syntax error, so it is reported whatever the type-checking mode. */
const MISTAKE = "def broken(:\n";

  const fileIn = (folder: string) =>
    new Editor.Model({
      name: "main.py",
      parent: { path: `/${folder}` },
      source: MISTAKE,
    });

  const markersOn = async (file: EditableFile) => {
    const monaco = await import("monaco-editor");
    return monaco.editor.getModelMarkers({ resource: uri(file.path) });
  };

  const untilReported = async (file: EditableFile, attempts = 300) => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const markers = await markersOn(file);
      if (markers.length > 0) return markers;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return [];
  };
</script>

<Sweater config category="Diagnostic filters" mode="serial" />

<Sweater
  name="reports a mistake when nothing filters it"
  body={async ({ set, expect, note }) => {
    const file = fileIn("diagnostics-reported");
    set(new Pocket(file));

    const markers = await untilReported(file);
    note(`markers: ${JSON.stringify(markers.map((each) => each.message))}`);

    expect(markers.length).toBeGreaterThan(0);
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 480px; height: 200px;">
      {#if pocket.file}
        <Editor.Component file={pocket.file} />
      {/if}
    </div>
  {/snippet}
</Sweater>

<Sweater
  name="a filter registered for one folder silences it there"
  body={async ({ set, expect, delay, note }) => {
    const undo = Editor.registerDiagnosticFilter({
      path: /^diagnostics-filtered\//,
    });

    const file = fileIn("diagnostics-filtered");
    set(new Pocket(file));

    await delay({ seconds: 8 });
    const markers = await markersOn(file);
    note(`markers: ${JSON.stringify(markers.map((each) => each.message))}`);
    undo();

    expect(markers).toHaveLength(0);
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 480px; height: 200px;">
      {#if pocket.file}
        <Editor.Component file={pocket.file} />
      {/if}
    </div>
  {/snippet}
</Sweater>

<Sweater
  name="the published notebook filters are registered out of the box"
  body={async ({ set, expect }) => {
    set(new Pocket(fileIn("diagnostics-defaults")));

    expect(Editor.diagnosticFilters()).toContain(
      DiagnosticFilter.trailingExpression,
    );
    expect(Editor.diagnosticFilters()).toContain(
      DiagnosticFilter.undefinedNames,
    );
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 480px; height: 200px;">
      {#if pocket.file}
        <Editor.Component file={pocket.file} />
      {/if}
    </div>
  {/snippet}
</Sweater>

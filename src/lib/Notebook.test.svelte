<script lang="ts">
  import { Sweater } from "../../sweater-vest-suede";
  import { Notebook } from "../../release/index";
  import { uri, workspace } from "../../release/workspace";
  import type { EditableFile } from "../../release/models.svelte";

  class Pocket {
    notebook = $state<Notebook.Model>()!;
    constructor(notebook: Notebook.Model) {
      this.notebook = notebook;
    }
  }

  const lesson = (path: string) => {
    const notebook = new Notebook.Model({ path });
    notebook.add("greeting = 'hello'");
    notebook.add("def shout(word: str) -> str:\n    return word.upper()");
    notebook.add("shout(greeting)");
    return notebook;
  };

  const PATIENCE = { attempts: 450, gap: 200 };

  const askUntilAnswered = async (ask: () => Promise<any>) => {
    for (let attempt = 0; attempt < PATIENCE.attempts; attempt++) {
      const answer = await ask().catch(() => undefined);
      if (answer !== undefined && answer !== null) return answer;
      await new Promise((resolve) => setTimeout(resolve, PATIENCE.gap));
    }
    return undefined;
  };

  const at = (cell: EditableFile, line: number, character: number) => ({
    textDocument: { uri: uri(cell.path).toString() },
    position: { line, character },
  });

  const ask = async (method: string, params: unknown) => {
    const client = await workspace.client;
    return client.sendRequest(method, params) as Promise<any>;
  };

  const rendered = JSON.stringify;
</script>

<Sweater config category="Notebook" mode="serial" />

<Sweater
  name="a later cell sees a name bound by an earlier one"
  body={async ({ set, expect, note }) => {
    const notebook = lesson("/hover-lesson");
    set(new Pocket(notebook));

    const [, , third] = notebook.cells;
    const hover = await askUntilAnswered(() =>
      ask("textDocument/hover", at(third, 0, 8)),
    );

    note(`hover: ${rendered(hover)}`);
    expect(rendered(hover.contents)).toContain("greeting");
    expect(rendered(hover.contents)).toContain("hello");
    expect(hover.range.start.line).toBe(0);
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 520px;">
      {#if pocket.notebook}
        <Notebook.Component notebook={pocket.notebook} />
      {/if}
    </div>
  {/snippet}
</Sweater>

<Sweater
  name="go-to-definition lands in the cell that owns the symbol"
  body={async ({ set, expect, note }) => {
    const notebook = lesson("/definition-lesson");
    set(new Pocket(notebook));

    const [first, second, third] = notebook.cells;
    const found = await askUntilAnswered(() =>
      ask("textDocument/definition", at(third, 0, 1)).then((locations) =>
        locations?.length ? locations : undefined,
      ),
    );

    note(`definition: ${rendered(found)}`);
    expect(found?.[0]?.uri).toBe(uri(second.path).toString());
    expect(found?.[0]?.range.start.line).toBe(0);
    expect(first).toBeDefined();
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 520px;">
      {#if pocket.notebook}
        <Notebook.Component notebook={pocket.notebook} />
      {/if}
    </div>
  {/snippet}
</Sweater>

<Sweater
  name="diagnostics from an earlier cell are not repeated on a later one"
  body={async ({ set, expect, delay, note }) => {
    const notebook = new Notebook.Model({ path: "/diagnostic-lesson" });
    notebook.add("value: int = 'not an int'");
    notebook.add("value + 1");
    set(new Pocket(notebook));

    const [first, second] = notebook.cells;
    await workspace.client;
    const monaco = await import("monaco-editor");
    const reported = (cell: EditableFile) =>
      monaco.editor
        .getModelMarkers({ resource: uri(cell.path) })
        .map((marker) => marker.message);

    const onFirst = await askUntilAnswered(async () => {
      const messages = reported(first);
      return messages.length > 0 ? messages : undefined;
    });

    note(`cell 1: ${rendered(onFirst)}`);
    note(`cell 2: ${rendered(reported(second))}`);

    // Without this the assertion below would hold for a notebook nobody analysed.
    expect(onFirst?.some((message: string) => message.includes("not an int"))).toBe(
      true,
    );
    expect(
      reported(second).some((message) => message.includes("not an int")),
    ).toBe(false);
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 520px;">
      {#if pocket.notebook}
        <Notebook.Component notebook={pocket.notebook} />
      {/if}
    </div>
  {/snippet}
</Sweater>

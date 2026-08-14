<script lang="ts">
  import { Sweater } from "../../sweater-vest-suede";
  import { Editor, type FileProvider } from "../../release/index";
  import type { EditableFile } from "../../release/models.svelte";
  import { uri, workspace } from "../../release/workspace";

  class Pocket {
    file = $state<EditableFile>()!;
    constructor(file: EditableFile) {
      this.file = file;
    }
  }

  const sourcesUnder = (root: string) => ({
    [`${root}/main.py`]: `from ${root}.shapes.circle import area\n\narea(2)`,
    [`${root}/shapes/__init__.py`]: "",
    [`${root}/shapes/circle.py`]:
      "import math\n\n\ndef area(radius: float) -> float:\n    return math.pi * radius**2",
    [`${root}/unopened.py`]: "never_needed = True",
  });

  const recordingProvider = (root: string) => {
    const sources = sourcesUnder(root);
    const reads: string[] = [];
    const provider: FileProvider = {
      paths: () => Object.keys(sources),
      read: (path) => {
        reads.push(path);
        return sources[path];
      },
    };
    return { provider, reads, sources };
  };

  const PATIENCE = { attempts: 900, gap: 100 };

  const until = async (condition: () => boolean) => {
    for (let attempt = 0; attempt < PATIENCE.attempts; attempt++) {
      if (condition()) return true;
      await new Promise((resolve) => setTimeout(resolve, PATIENCE.gap));
    }
    return condition();
  };

  const mainOf = (root: string) =>
    new Editor.Model({ name: "main.py", parent: { path: `/${root}` }, source: "" });

  const askUntilAnswered = async (ask: () => Promise<any>) => {
    for (let attempt = 0; attempt < PATIENCE.attempts; attempt++) {
      const answer = await ask().catch(() => undefined);
      if (answer !== undefined && answer !== null) return answer;
      await new Promise((resolve) => setTimeout(resolve, PATIENCE.gap));
    }
    return undefined;
  };

  const hoverOver = async (path: string, line: number, character: number) => {
    const client = await workspace.client;
    return askUntilAnswered(() =>
      client.sendRequest("textDocument/hover", {
        textDocument: { uri: uri(path).toString() },
        position: { line, character },
      }),
    );
  };
</script>

<Sweater config category="Editor" mode="serial" />

<Sweater
  name="pulls content through the provider instead of holding a copy"
  body={async ({ set, expect }) => {
    const { provider, reads, sources } = recordingProvider("pull");
    await Editor.provideFiles(provider);

    const file = mainOf("pull");
    set(new Pocket(file));

    await until(() => file.source !== "");

    expect(reads).toContain("pull/main.py");
    expect(file.source).toBe(sources["pull/main.py"]);
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 480px; height: 220px;">
      {#if pocket.file}
        <Editor.Component file={pocket.file} />
      {/if}
    </div>
  {/snippet}
</Sweater>

<Sweater
  name="follows the open file's imports and stops there"
  body={async ({ set, expect, delay, note }) => {
    const { provider, reads } = recordingProvider("closure");
    await Editor.provideFiles(provider);

    const file = mainOf("closure");
    set(new Pocket(file));

    await until(() => reads.includes("closure/shapes/circle.py"));
    await delay({ seconds: 1 });
    note(`read: ${reads.join(", ")}`);

    expect(reads).toContain("closure/shapes/circle.py");
    expect(reads).not.toContain("closure/unopened.py");
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 480px; height: 220px;">
      {#if pocket.file}
        <Editor.Component file={pocket.file} />
      {/if}
    </div>
  {/snippet}
</Sweater>

<Sweater
  name="types an import the server was never given eagerly"
  body={async ({ set, expect, note }) => {
    const { provider } = recordingProvider("delivery");
    await Editor.provideFiles(provider);

    const file = mainOf("delivery");
    set(new Pocket(file));
    await until(() => file.source !== "");

    const hover = await hoverOver(file.path, 2, 1);
    note(`hover on area(): ${JSON.stringify(hover)}`);

    expect(JSON.stringify(hover)).toContain("radius: float");
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 480px; height: 220px;">
      {#if pocket.file}
        <Editor.Component file={pocket.file} />
      {/if}
    </div>
  {/snippet}
</Sweater>

<Sweater
  name="keeps working when an editor opens a file already delivered as a dependency"
  body={async ({ set, expect, note }) => {
    const { provider } = recordingProvider("reopen");
    await Editor.provideFiles(provider);

    const main = mainOf("reopen");
    set(new Pocket(main));
    await until(() => main.source !== "");
    expect(JSON.stringify(await hoverOver(main.path, 2, 1))).toContain("float");

    const dependency = new Editor.Model({
      name: "circle.py",
      parent: { path: "/reopen/shapes" },
      source: "",
    });
    set(new Pocket(dependency));
    await until(() => dependency.source !== "");

    const hover = await hoverOver(dependency.path, 3, 5);
    note(`hover inside the dependency: ${JSON.stringify(hover)}`);

    expect(JSON.stringify(hover)).toContain("area");
  }}
>
  {#snippet vest(pocket: Pocket)}
    <div style="width: 480px; height: 220px;">
      {#if pocket.file}
        <Editor.Component file={pocket.file} />
      {/if}
    </div>
  {/snippet}
</Sweater>

<script lang="ts">
  import { Sweater } from "../../../sweater-vest-suede";
  import { FileProvider } from "../../../release/filesystem/provider";
  import { DemandLoader, type FileIndex } from "../../../release/language/demand";
  import { OpenDocuments } from "../../../release/language/documents";

  class Pocket {
    ran = $state(false);
  }

  const library: Record<string, string> = {
    "main.py": "from shapes.circle import area\n\narea(2)",
    "shapes/__init__.py": "",
    "shapes/circle.py": "import math\n\ndef area(r: float) -> float:\n    return math.pi * r * r",
    "orphan.py": "never_reached = True",
    "packages/vendored.py": "value = 1",
  };

  const workspace = () => {
    const reads: string[] = [];
    const contents = { ...library };
    const listeners: FileProvider.Listener[] = [];
    const index: FileIndex = {
      has: (path) => path in contents,
      read: (path) => {
        reads.push(path);
        return contents[path];
      },
      onDidChange: (listen) => listeners.push(listen),
    };
    const announce = (change: FileProvider.Change) =>
      listeners.forEach((listen) => listen(change));
    return { index, reads, contents, announce };
  };

  const recordingClient = () => {
    const sent: { method: string; params: any }[] = [];
    return {
      sent,
      /** Content only ever reaches the server as an open or changed document. */
      delivered: () =>
        sent
          .filter(({ method }) => method.startsWith("textDocument/did"))
          .map(({ params }) => params.textDocument.uri),
      created: () =>
        sent
          .filter(({ method }) => method === "pyright/createFile")
          .map(({ params }) => params.uri),
      textFor: (uri: string) =>
        sent
          .filter(({ params }) => params.textDocument?.uri === uri)
          .map(({ params }) => params.textDocument.text ?? params.contentChanges[0].text),
      client: async () => ({
        sendNotification: async (method: string, params: unknown) => {
          sent.push({ method, params: params as any });
        },
      }),
    };
  };

  const uriOf = (path: string) => `file:///workspace/${path}`;

  const loaderFor = (index: FileIndex) => {
    const recorder = recordingClient();
    const documents = new OpenDocuments();
    const loader = new DemandLoader(index, recorder.client, documents, (path) => ({
      toString: () => uriOf(path),
    }));
    return { loader, recorder, documents };
  };
</script>

<Sweater config category="Demand" orientation="vertical" />

<Sweater
  name="delivers what the entry imports, and leaves the entry to its editor"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const { index } = workspace();
    const { loader, recorder } = loaderFor(index);

    await loader.reach("main.py");

    expect(recorder.delivered()).toMatchObject([uriOf("shapes/circle.py")]);
    expect(recorder.created()).toMatchObject([uriOf("shapes/circle.py")]);
  }}
>
  {#snippet vest(_: Pocket)}<span>closure</span>{/snippet}
</Sweater>

<Sweater
  name="never reads a file nothing imports"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const { index, reads } = workspace();
    const { loader } = loaderFor(index);

    await loader.reach("main.py");

    expect(reads).not.toContain("orphan.py");
  }}
>
  {#snippet vest(_: Pocket)}<span>laziness</span>{/snippet}
</Sweater>

<Sweater
  name="delivers a file once however many entry points reach it"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const { index, contents } = workspace();
    contents["other.py"] = "import shapes.circle";
    const { loader, recorder } = loaderFor(index);

    await loader.reach("main.py");
    await loader.reach("other.py");

    expect(
      recorder.delivered().filter((uri) => uri.endsWith("shapes/circle.py")),
    ).toHaveLength(1);
  }}
>
  {#snippet vest(_: Pocket)}<span>once</span>{/snippet}
</Sweater>

<Sweater
  name="redelivers a file after the provider reports it changed"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const { index, contents, announce } = workspace();
    const { loader, recorder } = loaderFor(index);

    await loader.reach("main.py");
    contents["shapes/circle.py"] = "def area(r): return 0";
    announce({ path: "shapes/circle.py", kind: "changed" });
    await loader.reach("shapes/circle.py");

    expect(recorder.textFor(uriOf("shapes/circle.py"))).toMatchObject([
      library["shapes/circle.py"],
      "def area(r): return 0",
    ]);
  }}
>
  {#snippet vest(_: Pocket)}<span>invalidation</span>{/snippet}
</Sweater>

<Sweater
  name="tells the server to forget a file the provider removed"
  body={async ({ set, expect, delay }) => {
    set(new Pocket());
    const { index, announce } = workspace();
    const { loader, recorder } = loaderFor(index);

    await loader.reach("main.py");
    announce({ path: "shapes/circle.py", kind: "removed" });
    await delay({ milliseconds: 20 });

    expect(recorder.sent).toContainEqual({
      method: "pyright/deleteFile",
      params: { uri: uriOf("shapes/circle.py") },
    });
  }}
>
  {#snippet vest(_: Pocket)}<span>removal</span>{/snippet}
</Sweater>

<Sweater
  name="finds a bare module under an added search root"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const { index, contents } = workspace();
    contents["uses-vendored.py"] = "import vendored";
    const { loader, recorder } = loaderFor(index);

    loader.addSearchRoot("packages");
    await loader.reach("uses-vendored.py");

    expect(recorder.delivered()).toContain(uriOf("packages/vendored.py"));
  }}
>
  {#snippet vest(_: Pocket)}<span>search roots</span>{/snippet}
</Sweater>

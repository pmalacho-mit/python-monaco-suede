<script lang="ts">
  import { Editor, Notebook, type FileProvider } from "../../release";

  const library: Record<string, string> = {
    "hi.py": "x = 5\n",
    "shapes/__init__.py": "",
    "shapes/circle.py": "import math\n\n\ndef area(radius: float) -> float:\n    return math.pi * radius**2\n",
    "unused/never_imported.py": "should_never_be_fetched = True\n",
  };

  const fetched: string[] = $state([]);

  const onDemand: FileProvider = {
    paths: () => Object.keys(library),
    read: (path) => {
      fetched.push(path);
      return library[path];
    },
  };

  Editor.provideFiles(onDemand);

  const file = new Editor.Model({
    name: "example.py",
    parent: { path: "/" },
    source: "from hi import x\nfrom shapes.circle import area\n\narea(x)\n",
  });

  const notebook = new Notebook.Model({ path: "/lesson" });
  notebook.add("import math\n\ngreeting = 'hello'\n");
  notebook.add("def shout(word: str) -> str:\n    return word.upper()\n");
  notebook.add("shout(greeting)\n");

  let size = $state(14);
</script>

<div style="width: 90vw; height: 40vh;">
  <Editor.Component {file} {size} />
</div>

<div>
  <button onclick={() => (file.readonly = !file.readonly)}>readonly</button>
  <label>
    Font Size: <input type="range" bind:value={size} min="8" max="48" />
    {size}px
  </label>
</div>

<h3>Notebook</h3>
<div style="width: 90vw;">
  <Notebook.Component {notebook} {size} />
</div>
<button onclick={() => notebook.add("")}>add cell</button>

<h3>Files actually read from the provider</h3>
<ul>
  {#each fetched as path}
    <li>{path}</li>
  {/each}
</ul>

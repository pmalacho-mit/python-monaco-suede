<script lang="ts">
  import { Editor } from "../../release/";

  const file = new Editor.Model({
    name: "example.py",
    content: "from hi import x",
    parent: {
      path: "/",
    },
  });

  Editor.registerFile({
    path: "hi.py",
    content: "x = 5",
  });

  let size = $state(14);
</script>

<div style="width: 90vw; height: 50vh;">
  <Editor.Component {file} {size} />
</div>

<div>
  <button onclick={() => (file.readonly = !file.readonly)}>readonly</button>
  <label>
    Font Size: <input type="range" bind:value={size} min="8" max="48" />
    {size}px
  </label>
</div>

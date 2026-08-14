<script lang="ts">
  import { Sweater } from "../../../sweater-vest-suede";
  import { Imports } from "../../../release/language/imports";

  class Pocket {
    ran = $state(false);
  }
</script>

<Sweater config category="Imports" orientation="vertical" />

<Sweater
  name="reads every module named by an import statement"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const scanned = Imports.scan(
      [
        "import os",
        "import a.b, c as d  # trailing comment",
        "from .sibling import thing",
        "from ..parent.pkg import (one, two)",
        "from typing import *",
      ].join("\n"),
    );

    expect(scanned).toMatchObject([
      { ascend: 0, parts: ["os"], names: [] },
      { ascend: 0, parts: ["a", "b"], names: [] },
      { ascend: 0, parts: ["c"], names: [] },
      { ascend: 1, parts: ["sibling"], names: ["thing"] },
      { ascend: 2, parts: ["parent", "pkg"], names: ["one", "two"] },
      { ascend: 0, parts: ["typing"], names: [] },
    ]);
  }}
>
  {#snippet vest(_: Pocket)}<span>scan</span>{/snippet}
</Sweater>

<Sweater
  name="ignores import-like text inside comments"
  body={async ({ set, expect }) => {
    set(new Pocket());
    expect(Imports.scan("# import os\nvalue = 1")).toMatchObject([]);
  }}
>
  {#snippet vest(_: Pocket)}<span>comments</span>{/snippet}
</Sweater>

<Sweater
  name="offers module, package and stub paths for an absolute import"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const [reference] = Imports.scan("from shapes.circle import area");
    expect(Imports.candidates(reference, "main.py")).toMatchObject([
      "shapes/circle.pyi",
      "shapes/circle.py",
      "shapes/circle/__init__.py",
      "shapes/circle/area.pyi",
      "shapes/circle/area.py",
      "shapes/circle/area/__init__.py",
    ]);
  }}
>
  {#snippet vest(_: Pocket)}<span>absolute</span>{/snippet}
</Sweater>

<Sweater
  name="resolves a relative import against the importing file"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const [sibling] = Imports.scan("from .circle import area");
    const [parent] = Imports.scan("from ..util import helper");

    expect(Imports.candidates(sibling, "shapes/square.py")).toContain(
      "shapes/circle.py",
    );
    expect(Imports.candidates(parent, "shapes/square.py")).toContain(
      "util.py",
    );
  }}
>
  {#snippet vest(_: Pocket)}<span>relative</span>{/snippet}
</Sweater>

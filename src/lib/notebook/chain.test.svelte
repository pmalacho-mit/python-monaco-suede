<script lang="ts">
  import { Sweater } from "../../../sweater-vest-suede";
  import {
    chainedDocument,
    originOf,
    preludeOffset,
    type Cell,
  } from "../../../release/notebook/chain";

  class Pocket {
    ran = $state(false);
  }

  const preceding: Cell[] = [
    { uri: "cell://one", text: "greeting = 'hello'" },
    { uri: "cell://two", text: "def shout(word):\n    return word.upper()" },
  ];
</script>

<Sweater config category="Chain" orientation="vertical" />

<Sweater
  name="puts every earlier cell in front of the one being analysed"
  body={async ({ set, expect }) => {
    set(new Pocket());
    expect(chainedDocument(preceding, "shout(greeting)")).toBe(
      [
        "greeting = 'hello'",
        "def shout(word):",
        "    return word.upper()",
        "shout(greeting)",
      ].join("\n"),
    );
  }}
>
  {#snippet vest(_: Pocket)}<span>document</span>{/snippet}
</Sweater>

<Sweater
  name="offset counts the lines the prelude adds"
  body={async ({ set, expect }) => {
    set(new Pocket());
    expect(preludeOffset([])).toBe(0);
    expect(preludeOffset(preceding)).toBe(3);
  }}
>
  {#snippet vest(_: Pocket)}<span>offset</span>{/snippet}
</Sweater>

<Sweater
  name="traces a prelude line back to the cell it came from"
  body={async ({ set, expect }) => {
    set(new Pocket());
    expect(originOf(preceding, 0)).toMatchObject({
      uri: "cell://one",
      line: 0,
    });
    expect(originOf(preceding, 2)).toMatchObject({
      uri: "cell://two",
      line: 1,
    });
    expect(originOf(preceding, 3)).toBeUndefined();
  }}
>
  {#snippet vest(_: Pocket)}<span>origin</span>{/snippet}
</Sweater>

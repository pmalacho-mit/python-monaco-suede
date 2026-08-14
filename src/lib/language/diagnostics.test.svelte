<script lang="ts">
  import { Sweater } from "../../../sweater-vest-suede";
  import {
    DiagnosticFilter,
    DiagnosticFilters,
    defaultFilters,
    type Diagnostic,
  } from "../../../release/language/diagnostics";

  class Pocket {
    ran = $state(false);
  }

  /** Only the fields a filter reads; the real type carries far more. */
  const fixture = (diagnostic: {
    code: unknown;
    message: string;
    range: { start: { line: number } };
  }) => diagnostic as unknown as Diagnostic;

  const at = (line: number, code: string, message = code) =>
    fixture({ code: { value: code }, message, range: { start: { line } } });

  const cell = { path: "lesson/cell-1.py", lines: ["greeting", ""] };

  const emptyRegistry = () => {
    const filters = new DiagnosticFilters();
    defaultFilters.forEach((filter) => filters.unregister(filter));
    return filters;
  };
</script>

<Sweater config category="Diagnostics" orientation="vertical" />

<Sweater
  name="keeps a trailing expression quiet only on the last meaningful line"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const filters = new DiagnosticFilters();
    const reported = filters.apply(
      [at(0, "reportUnusedExpression"), at(1, "reportUnusedExpression")],
      { path: "lesson/cell-1.py", lines: ["earlier", "greeting", "", ""] },
    );

    expect(reported.map((each) => each.range.start.line)).toMatchObject([0]);
  }}
>
  {#snippet vest(_: Pocket)}<span>trailing</span>{/snippet}
</Sweater>

<Sweater
  name="narrows by rule code"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const filters = emptyRegistry();
    filters.register({ code: "reportUndefinedVariable" });

    const reported = filters.apply(
      [at(0, "reportUndefinedVariable"), at(0, "reportGeneralTypeIssues")],
      cell,
    );

    expect(reported.map((each) => each.message)).toMatchObject([
      "reportGeneralTypeIssues",
    ]);
  }}
>
  {#snippet vest(_: Pocket)}<span>by code</span>{/snippet}
</Sweater>

<Sweater
  name="narrows by path, so one view's rules do not reach another's files"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const filters = emptyRegistry();
    filters.register({ code: "reportUnusedExpression", path: /^lesson\// });

    const inNotebook = filters.apply([at(0, "reportUnusedExpression")], cell);
    const inScript = filters.apply([at(0, "reportUnusedExpression")], {
      path: "scripts/main.py",
      lines: ["greeting"],
    });

    expect(inNotebook).toHaveLength(0);
    expect(inScript).toHaveLength(1);
  }}
>
  {#snippet vest(_: Pocket)}<span>by path</span>{/snippet}
</Sweater>

<Sweater
  name="accepts a predicate over the document's content"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const filters = emptyRegistry();
    filters.register({
      when: ({ lines }) => lines.some((line) => line.startsWith("# no-check")),
    });

    const optedOut = filters.apply([at(0, "reportAny")], {
      path: "a.py",
      lines: ["# no-check", "x"],
    });
    const ordinary = filters.apply([at(0, "reportAny")], {
      path: "a.py",
      lines: ["x"],
    });

    expect(optedOut).toHaveLength(0);
    expect(ordinary).toHaveLength(1);
  }}
>
  {#snippet vest(_: Pocket)}<span>by content</span>{/snippet}
</Sweater>

<Sweater
  name="reads a rule code whether it arrives bare or wrapped"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const filters = emptyRegistry();
    filters.register({ code: "reportUnusedExpression" });

    const bare = fixture({
      code: "reportUnusedExpression",
      message: "bare",
      range: { start: { line: 0 } },
    });

    expect(filters.apply([bare, at(0, "reportOther")], cell)).toHaveLength(1);
  }}
>
  {#snippet vest(_: Pocket)}<span>code shapes</span>{/snippet}
</Sweater>

<Sweater
  name="unregisters, by the returned undo or by the filter itself"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const filters = new DiagnosticFilters();
    const undo = filters.register({ code: "reportGeneralTypeIssues" });

    expect(filters.apply([at(0, "reportGeneralTypeIssues")], cell)).toHaveLength(
      0,
    );

    undo();
    expect(filters.apply([at(0, "reportGeneralTypeIssues")], cell)).toHaveLength(
      1,
    );

    expect(filters.apply([at(0, "reportUndefinedVariable")], cell)).toHaveLength(
      0,
    );
    filters.unregister(DiagnosticFilter.undefinedNames);
    expect(filters.apply([at(0, "reportUndefinedVariable")], cell)).toHaveLength(
      1,
    );
  }}
>
  {#snippet vest(_: Pocket)}<span>lifecycle</span>{/snippet}
</Sweater>

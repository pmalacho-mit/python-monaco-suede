<script lang="ts">
  import { Sweater } from "../../../sweater-vest-suede";
  import {
    chainedDocument,
    originOf,
    preludeOffset,
    type Cell,
  } from "../../../release/notebook/chain";
  import { ChainedTransform, type ChainedDocuments } from "../../../release/notebook/protocol";
  import { OpenDocuments } from "../../../release/language/documents";

  class Pocket {
    ran = $state(false);
  }

  const first: Cell = { uri: "cell://one", text: "greeting = 'hello'" };
  const second = "cell://two";
  const notACell = "file:///workspace/main.py";

  const documents: ChainedDocuments = {
    offset: (uri) => (uri === second ? preludeOffset([first]) : undefined),
    document: (uri) =>
      uri === second ? chainedDocument([first], "shout(greeting)") : undefined,
    origin: (uri, line) =>
      uri === second ? originOf([first], line) : undefined,
  };

  const transform = () => new ChainedTransform(documents, new OpenDocuments());

  const request = (id: number, method: string, params: unknown) => ({
    jsonrpc: "2.0" as const,
    id,
    method,
    params,
  });

  const at = (uri: string, line: number, character = 0) => ({
    textDocument: { uri },
    position: { line, character },
  });
</script>

<Sweater config category="Protocol" orientation="vertical" />

<Sweater
  name="sends the chained document when a cell is opened"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const sent: any = transform().outgoing({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: second,
          languageId: "python",
          version: 1,
          text: "shout(greeting)",
        },
      },
    } as any);

    expect(sent.params.textDocument.text).toBe(
      "greeting = 'hello'\nshout(greeting)",
    );
  }}
>
  {#snippet vest(_: Pocket)}<span>didOpen</span>{/snippet}
</Sweater>

<Sweater
  name="numbers cell versions itself so resends never go backwards"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const chained = transform();
    const versions = [1, 2, 3].map(
      () =>
        (
          chained.outgoing({
            jsonrpc: "2.0",
            method: "textDocument/didChange",
            params: { textDocument: { uri: second, version: 0 }, contentChanges: [] },
          } as any) as any
        ).params.textDocument.version,
    );

    expect(versions).toMatchObject([1, 2, 3]);
  }}
>
  {#snippet vest(_: Pocket)}<span>versions</span>{/snippet}
</Sweater>

<Sweater
  name="shifts a request position into the chained document"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const sent: any = transform().outgoing(
      request(1, "textDocument/hover", at(second, 0, 3)) as any,
    );
    expect(sent.params.position).toMatchObject({ line: 1, character: 3 });
  }}
>
  {#snippet vest(_: Pocket)}<span>shift</span>{/snippet}
</Sweater>

<Sweater
  name="leaves documents that are not cells untouched"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const original = request(1, "textDocument/hover", at(notACell, 4));
    expect(transform().outgoing(original as any)).toBe(original);
  }}
>
  {#snippet vest(_: Pocket)}<span>passthrough</span>{/snippet}
</Sweater>

<Sweater
  name="brings a hover range back into the cell the request came from"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const chained = transform();
    chained.outgoing(request(7, "textDocument/hover", at(second, 0)) as any);

    const received: any = chained.incoming({
      jsonrpc: "2.0",
      id: 7,
      result: {
        contents: "(function) shout",
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 5 },
        },
      },
    } as any);

    expect(received.result.range.start.line).toBe(0);
    expect(received.result.range.end.line).toBe(0);
  }}
>
  {#snippet vest(_: Pocket)}<span>hover</span>{/snippet}
</Sweater>

<Sweater
  name="points a definition in the prelude at the cell that owns it"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const chained = transform();
    chained.outgoing(request(9, "textDocument/definition", at(second, 0)) as any);

    const received: any = chained.incoming({
      jsonrpc: "2.0",
      id: 9,
      result: [
        {
          uri: second,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 8 },
          },
        },
      ],
    } as any);

    expect(received.result[0]).toMatchObject({
      uri: "cell://one",
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 8 },
      },
    });
  }}
>
  {#snippet vest(_: Pocket)}<span>definition</span>{/snippet}
</Sweater>

<Sweater
  name="drops diagnostics that belong to an earlier cell"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const published: any = transform().incoming({
      jsonrpc: "2.0",
      method: "textDocument/publishDiagnostics",
      params: {
        uri: second,
        diagnostics: [
          {
            message: "belongs to cell one",
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 1 },
            },
          },
          {
            message: "belongs to cell two",
            range: {
              start: { line: 1, character: 2 },
              end: { line: 1, character: 7 },
            },
          },
        ],
      },
    } as any);

    expect(published.params.diagnostics).toMatchObject([
      {
        message: "belongs to cell two",
        range: {
          start: { line: 0, character: 2 },
          end: { line: 0, character: 7 },
        },
      },
    ]);
  }}
>
  {#snippet vest(_: Pocket)}<span>diagnostics</span>{/snippet}
</Sweater>

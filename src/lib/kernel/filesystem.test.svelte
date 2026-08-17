<script lang="ts">
  import { Sweater } from "../../../sweater-vest-suede";
  import { FileProvider } from "../../../release/filesystem/provider";
  import {
    asFilesystem,
    asProvider,
    type KernelFilesystem,
    type SyncFileProvider,
  } from "../../../release/kernel/filesystem";

  class Pocket {
    ran = $state(false);
  }

  const contents: Record<string, string> = {
    "main.py": "from shapes.circle import area",
    "shapes/__init__.py": "",
    "shapes/circle.py": "def area(r: float) -> float: ...",
  };

  /** The shape a kernel consumer writes by hand and hands to `Kernel.Environment`. */
  const kernelFilesystem = (): KernelFilesystem & { written: string[] } => {
    const written: string[] = [];
    const directories = new Set(["shapes"]);
    return {
      written,
      get: (path) =>
        path in contents
          ? contents[path]
          : directories.has(path)
            ? { directory: true }
            : undefined,
      listDirectory: (path) =>
        [...Object.keys(contents), ...directories]
          .filter((each) => each.startsWith(path === "" ? "" : `${path}/`))
          .map((each) => each.slice(path === "" ? 0 : path.length + 1).split("/")[0])
          .filter((name, index, all) => all.indexOf(name) === index),
      put: (path, value) => {
        written.push(`${path}=${value}`);
      },
    };
  };

  const syncProvider = (): SyncFileProvider & { written: string[] } => {
    const written: string[] = [];
    return {
      written,
      paths: () => Object.keys(contents),
      read: (path) => contents[path],
      write: (path, text) => {
        written.push(`${path}=${text}`);
      },
    };
  };
</script>

<Sweater config category="WebKernel" orientation="vertical" />

<Sweater
  name="reads the kernel's filesystem as a provider the editor can mount"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const provider = asProvider(kernelFilesystem());

    expect([...(await provider.paths())].sort()).toMatchObject([
      "main.py",
      "shapes/__init__.py",
      "shapes/circle.py",
    ]);
    expect(await provider.read("shapes/circle.py")).toBe(
      contents["shapes/circle.py"],
    );
  }}
>
  {#snippet vest(_: Pocket)}<span>provider</span>{/snippet}
</Sweater>

<Sweater
  name="writes an edit back through the kernel's filesystem"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const filesystem = kernelFilesystem();
    const provider = asProvider(filesystem);

    await provider.write?.("main.py", "print('edited')");

    expect(filesystem.written).toMatchObject(["main.py=print('edited')"]);
  }}
>
  {#snippet vest(_: Pocket)}<span>write through</span>{/snippet}
</Sweater>

<Sweater
  name="mounts a provider as the synchronous filesystem the kernel expects"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const filesystem = asFilesystem(syncProvider());

    expect(filesystem.get("shapes/circle.py")).toBe(
      contents["shapes/circle.py"],
    );
    expect(filesystem.get("shapes")).toMatchObject({ directory: true });
    expect(filesystem.get("absent.py")).toBeUndefined();
    expect(filesystem.listDirectory("").sort()).toMatchObject([
      "main.py",
      "shapes",
    ]);
    expect(filesystem.listDirectory("shapes").sort()).toMatchObject([
      "__init__.py",
      "circle.py",
    ]);
  }}
>
  {#snippet vest(_: Pocket)}<span>filesystem</span>{/snippet}
</Sweater>

<Sweater
  name="notices files the provider gained after the kernel mounted it"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const memory = new FileProvider.Memory();
    memory.write("main.py", "x = 1");
    const filesystem = asFilesystem({
      paths: memory.paths,
      read: memory.read,
      write: memory.write,
      watch: memory.watch,
    });

    expect(filesystem.get("later.py")).toBeUndefined();
    memory.write("later.py", "y = 2");

    expect(filesystem.get("later.py")).toBe("y = 2");
    expect(filesystem.listDirectory("").sort()).toMatchObject([
      "later.py",
      "main.py",
    ]);
  }}
>
  {#snippet vest(_: Pocket)}<span>invalidation</span>{/snippet}
</Sweater>

<Sweater
  name="survives a round trip in either direction"
  body={async ({ set, expect }) => {
    set(new Pocket());
    const provider = asProvider(
      asFilesystem(syncProvider()),
    );

    expect([...(await provider.paths())].sort()).toMatchObject(
      Object.keys(contents).sort(),
    );
    expect(await provider.read("main.py")).toBe(contents["main.py"]);
  }}
>
  {#snippet vest(_: Pocket)}<span>round trip</span>{/snippet}
</Sweater>

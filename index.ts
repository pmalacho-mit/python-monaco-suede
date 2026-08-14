import { default as EditorComponent } from "./Editor.svelte";
import { default as NotebookComponent } from "./Notebook.svelte";
import { EditableFile } from "./models.svelte";
import { Notebook as NotebookModel } from "./notebook/models.svelte";
import type { PythonAnalysis } from "./language/settings";
import { FileProvider } from "./filesystem/provider";
import type { DiagnosticFilter } from "./language/diagnostics";
import { uri, workspace } from "./workspace";

export type { FileProvider } from "./filesystem/provider";
export type { PythonAnalysis } from "./language/settings";
export type { DiagnosticContext } from "./language/diagnostics";
/** Merges the filter type with the filters worth having by name. */
export { DiagnosticFilter } from "./language/diagnostics";
export type {
  KernelFilesystem,
  SyncFileProvider,
} from "./kernel/filesystem";

type Registration = Pick<EditableFile, "path" | "source">;

type MountOptions = {
  /** Workspace-relative directory that bare module names may be found under. */
  searchRoot?: string;
};

const searchUnder = (root: string) => {
  workspace.settings.addSearchPath(uri(root).path);
  workspace.imports.addSearchRoot(root);
};

export const Editor = {
  Component: EditorComponent,
  Model: EditableFile,

  registerFile: ({ path, source }: Registration) =>
    workspace.files.memory.write(path, source),

  unregisterFile: (path: string) => workspace.files.memory.remove(path),

  renameFile: (file: Registration, oldPath: string) => {
    workspace.files.memory.write(file.path, file.source);
    workspace.files.memory.remove(oldPath);
  },

  /**
   * Hands the editor a filesystem it does not own. Paths are read up front so
   * that imports resolve; content is fetched only for files something opens or
   * imports, and never copied into the editor.
   */
  provideFiles: async (provider: FileProvider, options: MountOptions = {}) => {
    const unmount = await workspace.files.mount(provider);
    if (options.searchRoot) searchUnder(options.searchRoot);
    return unmount;
  },

  configure: (analysis: PythonAnalysis) => workspace.settings.update(analysis),

  /**
   * Stops matching diagnostics from being reported. Returns the undo, so a
   * filter that belongs to one view can be dropped when that view goes away.
   */
  registerDiagnosticFilter: (filter: DiagnosticFilter) =>
    workspace.diagnostics.register(filter),

  unregisterDiagnosticFilter: (filter: DiagnosticFilter) =>
    workspace.diagnostics.unregister(filter),

  diagnosticFilters: () => workspace.diagnostics.registered(),
};

export namespace Editor {
  export type Model = EditableFile;
  export type Component = EditorComponent;
}

export const Notebook = {
  Component: NotebookComponent,
  Model: NotebookModel,
};

export namespace Notebook {
  export type Model = NotebookModel;
  export type Component = NotebookComponent;
}

export { WebKernel } from "./kernel/filesystem";

"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveDraft,
  publishPost,
  unpublishPost,
  deletePost,
} from "@/app/admin/(dashboard)/blog/actions";
import { generateSlug } from "@/lib/slug";

type SaveState = "saved" | "saving" | "unsaved" | "error";

interface EditorProps {
  postId: string;
  initialTitle: string;
  initialBody: Record<string, unknown>;
  initialExcerpt: string;
  initialCoverImage: string;
  initialSlug: string;
  initialTags: string[];
  initialAuthor: string;
  initialStatus: string;
  initialMetaTitle: string;
  initialMetaDesc: string;
}

export function BlogEditor({
  postId,
  initialTitle,
  initialBody,
  initialExcerpt,
  initialCoverImage,
  initialSlug,
  initialTags,
  initialAuthor,
  initialStatus,
  initialMetaTitle,
  initialMetaDesc,
}: EditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [coverImage, setCoverImage] = useState(initialCoverImage);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [author, setAuthor] = useState(initialAuthor);
  const [metaTitle, setMetaTitle] = useState(initialMetaTitle);
  const [metaDesc, setMetaDesc] = useState(initialMetaDesc);
  const [status, setStatus] = useState(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing your post…" }),
      CharacterCount,
    ],
    content: Object.keys(initialBody).length ? initialBody : undefined,
    editorProps: {
      attributes: {
        class: "min-h-[400px] focus:outline-none",
      },
    },
    onUpdate: () => {
      isDirty.current = true;
      setSaveState("unsaved");
      scheduleAutoSave();
    },
  });

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Auto-generate slug from title (only if not manually edited)
  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugEdited]);

  const getPayload = useCallback(() => {
    return {
      title,
      slug,
      excerpt,
      cover_image: coverImage || null,
      body: editor?.getJSON() ?? {},
      author,
      tags,
      meta_title: metaTitle || null,
      meta_desc: metaDesc || null,
    };
  }, [title, slug, excerpt, coverImage, editor, author, tags, metaTitle, metaDesc]);

  const save = useCallback(async () => {
    setSaveState("saving");
    try {
      await saveDraft(postId, getPayload());
      setSaveState("saved");
      isDirty.current = false;
      // Persist to localStorage backup
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `blog-backup-${postId}`,
          JSON.stringify({ ...getPayload(), savedAt: Date.now() }),
        );
      }
    } catch {
      setSaveState("error");
    }
  }, [postId, getPayload]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(save, 3000);
  }, [save]);

  // Also auto-save when metadata fields change
  useEffect(() => {
    if (!isDirty.current) return;
    scheduleAutoSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, excerpt, coverImage, author, tags, metaTitle, metaDesc]);

  const markDirty = () => {
    isDirty.current = true;
    setSaveState("unsaved");
  };

  // Image upload handler for editor
  const handleImageInsert = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/blog/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = (await res.json()) as { url: string };
        editor.chain().focus().setImage({ src: url }).run();
      } catch {
        alert("Image upload failed — please try again.");
      } finally {
        setUploadingImage(false);
      }
    };
    input.click();
  }, [editor]);

  // Cover image upload
  const handleCoverUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setCoverUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/blog/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = (await res.json()) as { url: string };
        setCoverImage(url);
        markDirty();
      } catch {
        alert("Cover image upload failed.");
      } finally {
        setCoverUploading(false);
      }
    };
    input.click();
  }, []);

  // Link toggle
  const handleLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  // Publish / unpublish
  const handlePublish = async () => {
    if (!title.trim()) return alert("Add a title before publishing.");
    if (!editor || editor.isEmpty) return alert("Add some content before publishing.");
    await save();
    setPublishing(true);
    try {
      if (status === "published") {
        await unpublishPost(postId);
        setStatus("archived");
      } else {
        await publishPost(postId);
        setStatus("published");
      }
      startTransition(() => router.refresh());
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post permanently? This cannot be undone.")) return;
    await deletePost(postId);
    router.push("/admin/blog");
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      markDirty();
    }
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
    markDirty();
  };

  const wordCount = editor?.storage.characterCount?.words() ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* ── Top bar ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-border/60 bg-bg/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <a
              href="/admin/blog"
              className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Blog
            </a>
            <span aria-hidden className="text-border/60">·</span>
            <StatusBadge status={status} />
          </div>

          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            <button
              type="button"
              onClick={save}
              disabled={saveState === "saving"}
              className="rounded-brand border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-50"
            >
              Save
            </button>
            {status === "published" && (
              <a
                href={`/news/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-brand border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
              >
                View ↗
              </a>
            )}
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className={`rounded-brand px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                status === "published"
                  ? "border border-border text-text-muted hover:border-primary hover:text-primary"
                  : "bg-primary text-white hover:bg-primary-hover"
              }`}
            >
              {publishing ? "…" : status === "published" ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-12">

          {/* Left: cover + title + editor */}
          <div className="min-w-0">

            {/* Cover image */}
            <div
              className="group relative mb-6 flex min-h-[180px] cursor-pointer items-center justify-center overflow-hidden rounded-brand border border-dashed border-border bg-surface/30 transition-colors hover:border-accent/60"
              onClick={handleCoverUpload}
            >
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage} alt="Cover" className="h-full max-h-64 w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-text-muted/60 transition-colors group-hover:text-text-muted">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  </svg>
                  <span className="text-sm">{coverUploading ? "Uploading…" : "Click to upload cover image"}</span>
                </div>
              )}
              {coverImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-sm text-white">{coverUploading ? "Uploading…" : "Change cover"}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <textarea
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty(); }}
              placeholder="Post title"
              rows={2}
              className="w-full resize-none bg-transparent font-heading text-3xl leading-tight text-text placeholder:text-text-muted/40 focus:outline-none sm:text-4xl"
            />

            {/* Slug row */}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-text-muted/60">/news/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); markDirty(); }}
                className="flex-1 border-b border-dashed border-border/60 bg-transparent pb-0.5 text-text-muted focus:border-accent focus:outline-none"
              />
              {status === "published" && (
                <span className="shrink-0 text-xs text-primary">⚠ changing slug breaks existing URL</span>
              )}
            </div>

            {/* Formatting toolbar */}
            <div className="mt-6 flex flex-wrap items-center gap-1 rounded-brand border border-border bg-surface/30 p-1.5">
              <ToolbarBtn
                active={editor?.isActive("heading", { level: 1 })}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                title="Heading 1"
              >H1</ToolbarBtn>
              <ToolbarBtn
                active={editor?.isActive("heading", { level: 2 })}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                title="Heading 2"
              >H2</ToolbarBtn>
              <ToolbarBtn
                active={editor?.isActive("heading", { level: 3 })}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                title="Heading 3"
              >H3</ToolbarBtn>
              <Divider />
              <ToolbarBtn
                active={editor?.isActive("bold")}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                title="Bold (Ctrl+B)"
              ><b>B</b></ToolbarBtn>
              <ToolbarBtn
                active={editor?.isActive("italic")}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                title="Italic (Ctrl+I)"
              ><i>I</i></ToolbarBtn>
              <Divider />
              <ToolbarBtn
                active={editor?.isActive("bulletList")}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                title="Bullet list"
              >•≡</ToolbarBtn>
              <ToolbarBtn
                active={editor?.isActive("orderedList")}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                title="Ordered list"
              >1≡</ToolbarBtn>
              <ToolbarBtn
                active={editor?.isActive("blockquote")}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                title="Blockquote"
              >"</ToolbarBtn>
              <ToolbarBtn
                active={editor?.isActive("codeBlock")}
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                title="Code block"
              >{`</>`}</ToolbarBtn>
              <Divider />
              <ToolbarBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider">
                —
              </ToolbarBtn>
              <ToolbarBtn
                active={editor?.isActive("link")}
                onClick={handleLink}
                title="Link (Ctrl+K)"
              >🔗</ToolbarBtn>
              <ToolbarBtn
                onClick={handleImageInsert}
                title="Insert image"
                disabled={uploadingImage}
              >
                {uploadingImage ? "…" : "🖼"}
              </ToolbarBtn>
            </div>


            {/* Editor content */}
            <div className="mt-4 rounded-brand border border-border bg-surface/20 p-6 sm:p-8">
              <EditorContent editor={editor} />
            </div>

            {/* Word count */}
            <p className="mt-2 text-right text-xs text-text-muted/50">
              {wordCount} {wordCount === 1 ? "word" : "words"} · ~{Math.max(1, Math.ceil(wordCount / 200))} min read
            </p>
          </div>

          {/* Right: settings sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24">

            {/* Post settings */}
            <div className="rounded-brand border border-border bg-surface/30">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-text"
              >
                Post settings
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 text-text-muted transition-transform ${settingsOpen ? "rotate-180" : ""}`}
                  fill="none"
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {settingsOpen && (
                <div className="space-y-4 border-t border-border/60 px-5 pb-5 pt-4">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-widest text-text-muted">Excerpt</span>
                    <textarea
                      value={excerpt}
                      onChange={(e) => { setExcerpt(e.target.value); markDirty(); }}
                      rows={3}
                      placeholder="Short summary shown in the post list…"
                      className="mt-2 w-full resize-none rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
                    />
                  </label>

                  <div>
                    <span className="text-xs font-medium uppercase tracking-widest text-text-muted">Tags</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-xs text-accent"
                        >
                          {t}
                          <button type="button" onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                        placeholder="Add tag…"
                        className="flex-1 rounded-brand border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="rounded-brand border border-border px-3 py-1.5 text-sm text-text-muted hover:border-accent hover:text-text"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-widest text-text-muted">Author</span>
                    <input
                      value={author}
                      onChange={(e) => { setAuthor(e.target.value); markDirty(); }}
                      className="mt-2 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                    />
                  </label>

                  {status === "published" && (
                    <p className="text-xs text-text-muted/60">
                      Published at <code className="font-mono">/news/{slug}</code>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* SEO panel */}
            <div className="rounded-brand border border-border bg-surface/30">
              <button
                type="button"
                onClick={() => setSeoOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-text"
              >
                SEO
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 text-text-muted transition-transform ${seoOpen ? "rotate-180" : ""}`}
                  fill="none"
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {seoOpen && (
                <div className="space-y-4 border-t border-border/60 px-5 pb-5 pt-4">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-widest text-text-muted">Meta title</span>
                    <input
                      value={metaTitle}
                      onChange={(e) => { setMetaTitle(e.target.value); markDirty(); }}
                      placeholder={title || "Falls back to post title"}
                      className="mt-2 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-widest text-text-muted">Meta description</span>
                    <textarea
                      value={metaDesc}
                      onChange={(e) => { setMetaDesc(e.target.value); markDirty(); }}
                      rows={3}
                      placeholder={excerpt || "Falls back to excerpt"}
                      className="mt-2 w-full resize-none rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="rounded-brand border border-border/50 bg-surface/20 px-5 py-4">
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-text-muted/60 transition-colors hover:text-primary"
              >
                Delete this post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function ToolbarBtn({
  children,
  onClick,
  active,
  title,
  disabled,
  compact,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm transition-colors disabled:opacity-40 ${compact ? "px-2 py-1.5" : "px-2.5 py-1.5"} ${
        active
          ? "bg-primary/15 text-primary"
          : "text-text-muted hover:bg-surface hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div aria-hidden className="mx-1 h-5 w-px bg-border/60" />;
}

function SaveIndicator({ state }: { state: SaveState }) {
  const map: Record<SaveState, { label: string; color: string }> = {
    saved: { label: "Saved", color: "text-text-muted/60" },
    saving: { label: "Saving…", color: "text-accent" },
    unsaved: { label: "Unsaved changes", color: "text-text-muted/60" },
    error: { label: "Save failed", color: "text-primary" },
  };
  const { label, color } = map[state];
  return <span className={`hidden text-xs sm:inline ${color}`}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-green-500/15 text-green-300",
    draft: "bg-border/40 text-text-muted",
    archived: "bg-border/40 text-text-muted",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? "bg-border/40 text-text-muted"}`}>
      {status}
    </span>
  );
}

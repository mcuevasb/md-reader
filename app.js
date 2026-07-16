"use strict";

const MERMAID_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/mermaid.min.js";

const fileInput = document.getElementById("file-input");
const fileStatus = document.getElementById("file-status");
const mobileFileName = document.getElementById("mobile-file-name");
const documentView = document.getElementById("document");
const dropZone = document.getElementById("drop-zone");
const dropOverlay = document.getElementById("drop-overlay");
const toc = document.getElementById("toc");
const sidebar = document.getElementById("sidebar");
const closeFileButton = document.getElementById("close-file");
const homeLinks = document.querySelectorAll("[data-home-link]");

let headingObserver = null;
let mermaidRenderVersion = 0;
let mermaidLoadPromise = null;
let dragDepth = 0;
let fontSize = Number(localStorage.getItem("md-reader-font-size")) || 18;

initializeTheme();
applyFontSize();

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) openMarkdownFile(file);
  event.target.value = "";
});

document.getElementById("toggle-theme").addEventListener("click", toggleTheme);
document.getElementById("increase-font").addEventListener("click", () => changeFontSize(1));
document.getElementById("decrease-font").addEventListener("click", () => changeFontSize(-1));
document.getElementById("print-document").addEventListener("click", () => window.print());
closeFileButton.addEventListener("click", closeMarkdownFile);
homeLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    closeMarkdownFile();
  });
});
document.getElementById("open-sidebar").addEventListener("click", () => sidebar.classList.add("open"));
document.getElementById("close-sidebar").addEventListener("click", () => sidebar.classList.remove("open"));

toc.addEventListener("click", (event) => {
  if (event.target.closest("a")) sidebar.classList.remove("open");
});

window.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;

  if (modifier && event.key.toLowerCase() === "o") {
    event.preventDefault();
    fileInput.click();
  }

  if (modifier && event.key === "+") {
    event.preventDefault();
    changeFontSize(1);
  }

  if (modifier && event.key === "-") {
    event.preventDefault();
    changeFontSize(-1);
  }

  if (event.key === "Escape") sidebar.classList.remove("open");
});

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  window.addEventListener(eventName, preventDefaults, false);
});

window.addEventListener("dragenter", () => {
  dragDepth += 1;
  dropOverlay.classList.add("visible");
  dropOverlay.setAttribute("aria-hidden", "false");
});

window.addEventListener("dragleave", () => {
  dragDepth -= 1;
  if (dragDepth <= 0) hideDropOverlay();
});

window.addEventListener("drop", (event) => {
  hideDropOverlay();
  const [file] = event.dataTransfer.files;
  if (file) openMarkdownFile(file);
});

dropZone.addEventListener("dragover", () => dropZone.classList.add("is-over"));
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-over"));
dropZone.addEventListener("drop", () => dropZone.classList.remove("is-over"));

function preventDefaults(event) {
  event.preventDefault();
  event.stopPropagation();
}

function hideDropOverlay() {
  dragDepth = 0;
  dropOverlay.classList.remove("visible");
  dropOverlay.setAttribute("aria-hidden", "true");
}

function isMarkdownFile(file) {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown") || file.type === "text/markdown" || file.type === "text/plain";
}

async function openMarkdownFile(file) {
  if (!isMarkdownFile(file)) {
    showStatus("El archivo seleccionado no parece ser Markdown.", true);
    return;
  }

  try {
    const text = await file.text();
    renderMarkdownDocument(text, file.name);
  } catch (error) {
    console.error(error);
    showStatus("No fue posible leer el archivo.", true);
  }
}

function renderMarkdownDocument(markdown, fileName) {
  const { html, headings } = markdownToHtml(markdown);
  documentView.innerHTML = html;
  documentView.hidden = false;
  dropZone.hidden = true;
  closeFileButton.hidden = false;

  const size = new Blob([markdown]).size;
  const sizeText = formatBytes(size);
  fileStatus.textContent = `${fileName} · ${sizeText}`;
  fileStatus.title = fileName;
  mobileFileName.textContent = fileName;
  document.title = `${fileName} — Lector de Markdown`;

  renderTableOfContents(headings);
  observeHeadings();
  void renderMermaidDiagrams();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeMarkdownFile() {
  mermaidRenderVersion += 1;

  if (headingObserver) {
    headingObserver.disconnect();
    headingObserver = null;
  }

  documentView.innerHTML = "";
  documentView.hidden = true;
  dropZone.hidden = false;
  closeFileButton.hidden = true;
  fileInput.value = "";

  fileStatus.textContent = "Selecciona o arrastra un archivo .md";
  fileStatus.removeAttribute("title");
  fileStatus.style.color = "";
  mobileFileName.textContent = "Sin archivo";
  document.title = "Lector de Markdown";
  toc.innerHTML = '<p class="muted">La tabla de contenido aparecerá al abrir un documento.</p>';
  sidebar.classList.remove("open");

  if (window.location.hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function markdownToHtml(markdown) {
  const normalized = markdown.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const lines = normalized.split("\n");
  const html = [];
  const headings = [];
  const usedIds = new Map();
  let index = 0;

  if (lines[0]?.trim() === "---") {
    const end = lines.slice(1).findIndex((line) => line.trim() === "---");
    if (end !== -1) {
      const frontMatterLines = lines.slice(1, end + 1);
      html.push(renderFrontMatter(frontMatterLines));
      index = end + 2;
    }
  }

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```\s*([\w.+#-]*)\s*$/);
    if (fence) {
      const language = fence[1] || "";
      const code = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;

      const normalizedLanguage = language.toLowerCase();
      if (normalizedLanguage === "mermaid" || normalizedLanguage === "mmd") {
        html.push(renderMermaidBlock(code.join("\n")));
        continue;
      }

      const languageLabel = language ? `<span class="code-language">${escapeHtml(language)}</span>` : "";
      html.push(`<pre>${languageLabel}<code${language ? ` class="language-${escapeAttribute(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const rawText = heading[2].trim();
      const plainText = stripInlineMarkdown(rawText);
      const id = uniqueSlug(plainText, usedIds);
      headings.push({ level, text: plainText, id });
      html.push(`<h${level} id="${escapeAttribute(id)}">${parseInline(rawText)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})\s*$/.test(line)) {
      html.push("<hr>");
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableResult = parseTable(lines, index);
      html.push(tableResult.html);
      index = tableResult.nextIndex;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && (/^\s*>/.test(lines[index]) || !lines[index].trim())) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${markdownToHtml(quoteLines.join("\n")).html}</blockquote>`);
      continue;
    }

    if (/^\s*([-+*])\s+/.test(line)) {
      const listResult = parseList(lines, index, false);
      html.push(listResult.html);
      index = listResult.nextIndex;
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const listResult = parseList(lines, index, true);
      html.push(listResult.html);
      index = listResult.nextIndex;
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !startsBlock(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${parseInline(paragraph.join(" "))}</p>`);
  }

  return { html: html.join("\n"), headings };
}

function loadMermaidLibrary() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (mermaidLoadPromise) return mermaidLoadPromise;

  mermaidLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MERMAID_SCRIPT_URL;
    script.async = true;
    script.dataset.mermaidLibrary = "true";

    script.addEventListener("load", () => {
      if (window.mermaid) {
        resolve(window.mermaid);
      } else {
        mermaidLoadPromise = null;
        reject(new Error("La biblioteca Mermaid se descargó, pero no pudo inicializarse."));
      }
    }, { once: true });

    script.addEventListener("error", () => {
      mermaidLoadPromise = null;
      script.remove();
      reject(new Error("No se pudo descargar la biblioteca Mermaid."));
    }, { once: true });

    document.head.appendChild(script);
  });

  return mermaidLoadPromise;
}

function renderMermaidBlock(source) {
  return `
    <figure class="mermaid-diagram" data-mermaid-diagram>
      <div class="mermaid-status" role="status">Renderizando diagrama…</div>
      <div class="mermaid-output" aria-label="Diagrama Mermaid"></div>
      <pre class="mermaid-source" hidden>${escapeHtml(source)}</pre>
    </figure>
  `;
}

async function renderMermaidDiagrams() {
  const diagrams = Array.from(documentView.querySelectorAll("[data-mermaid-diagram]"));
  if (!diagrams.length) return;

  const renderVersion = ++mermaidRenderVersion;

  diagrams.forEach((diagram) => {
    const status = diagram.querySelector(".mermaid-status");
    status.hidden = false;
    status.textContent = "Cargando Mermaid…";
  });

  let mermaidApi;
  try {
    mermaidApi = await loadMermaidLibrary();
  } catch (error) {
    console.error("No fue posible cargar Mermaid:", error);

    if (renderVersion !== mermaidRenderVersion) return;

    diagrams.forEach((diagram) => {
      showMermaidError(
        diagram,
        "No fue posible cargar Mermaid. Verifica la conexión a Internet y vuelve a abrir el archivo."
      );
    });
    return;
  }

  if (renderVersion !== mermaidRenderVersion) return;

  const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "default";

  mermaidApi.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme,
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
  });

  for (const [index, diagram] of diagrams.entries()) {
    if (renderVersion !== mermaidRenderVersion) return;

    const source = diagram.querySelector(".mermaid-source")?.textContent || "";
    const output = diagram.querySelector(".mermaid-output");
    const status = diagram.querySelector(".mermaid-status");

    diagram.classList.remove("is-rendered", "has-error");
    output.replaceChildren();
    status.hidden = false;
    status.textContent = "Renderizando diagrama…";

    const renderId = `mermaid-${renderVersion}-${index}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const { svg, bindFunctions } = await mermaidApi.render(renderId, source);

      if (renderVersion !== mermaidRenderVersion || !diagram.isConnected) return;

      output.innerHTML = svg;
      bindFunctions?.(output);
      status.hidden = true;
      diagram.classList.add("is-rendered");
    } catch (error) {
      document.getElementById(`d${renderId}`)?.remove();
      console.error("Error al renderizar Mermaid:", error);

      if (renderVersion !== mermaidRenderVersion || !diagram.isConnected) return;

      const message = error instanceof Error
        ? error.message.split("\n")[0]
        : "La definición del diagrama no es válida.";
      showMermaidError(diagram, message);
    }
  }
}

function showMermaidError(diagram, message) {
  const source = diagram.querySelector(".mermaid-source")?.textContent || "";
  const output = diagram.querySelector(".mermaid-output");
  const status = diagram.querySelector(".mermaid-status");

  diagram.classList.remove("is-rendered");
  diagram.classList.add("has-error");
  status.hidden = false;
  status.textContent = `No fue posible mostrar el diagrama: ${message}`;
  output.replaceChildren();

  const details = document.createElement("details");
  details.className = "mermaid-error-details";

  const summary = document.createElement("summary");
  summary.textContent = "Ver código Mermaid";

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = source;
  pre.appendChild(code);

  details.append(summary, pre);
  output.appendChild(details);
}

function startsBlock(lines, index) {
  const line = lines[index];
  return (
    /^\s*```/.test(line) ||
    /^(#{1,6})\s+/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*([-+*])\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^\s*((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})\s*$/.test(line) ||
    isTableStart(lines, index)
  );
}

function parseList(lines, startIndex, ordered) {
  const tag = ordered ? "ol" : "ul";
  const pattern = ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-+*]\s+(.+)$/;
  const items = [];
  let index = startIndex;
  let hasTasks = false;

  while (index < lines.length) {
    const match = lines[index].match(pattern);
    if (!match) break;

    let content = match[1].trim();
    const continuation = [];
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !pattern.test(lines[index]) &&
      !startsBlock(lines, index)
    ) {
      continuation.push(lines[index].trim());
      index += 1;
    }

    if (continuation.length) content += ` ${continuation.join(" ")}`;

    const task = content.match(/^\[([ xX])\]\s+(.+)$/);
    if (task) {
      hasTasks = true;
      const checked = task[1].toLowerCase() === "x";
      items.push(`<li class="task-list-item"><input type="checkbox" ${checked ? "checked" : ""} disabled> ${parseInline(task[2])}</li>`);
    } else {
      items.push(`<li>${parseInline(content)}</li>`);
    }
  }

  return {
    html: `<${tag}${hasTasks ? ' class="task-list"' : ""}>${items.join("")}</${tag}>`,
    nextIndex: index
  };
}

function isTableStart(lines, index) {
  if (index + 1 >= lines.length || !lines[index].includes("|")) return false;
  const separator = lines[index + 1].trim();
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separator);
}

function parseTable(lines, startIndex) {
  const headerCells = splitTableRow(lines[startIndex]);
  const alignCells = splitTableRow(lines[startIndex + 1]);
  const alignments = alignCells.map((cell) => {
    const value = cell.trim();
    if (value.startsWith(":") && value.endsWith(":")) return "center";
    if (value.endsWith(":")) return "right";
    return "left";
  });

  let index = startIndex + 2;
  const bodyRows = [];

  while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
    bodyRows.push(splitTableRow(lines[index]));
    index += 1;
  }

  const header = headerCells
    .map((cell, cellIndex) => `<th style="text-align:${alignments[cellIndex] || "left"}">${parseInline(cell.trim())}</th>`)
    .join("");

  const body = bodyRows
    .map((row) => `<tr>${headerCells.map((_, cellIndex) => `<td style="text-align:${alignments[cellIndex] || "left"}">${parseInline((row[cellIndex] || "").trim())}</td>`).join("")}</tr>`)
    .join("");

  return {
    html: `<div class="table-wrapper"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`,
    nextIndex: index
  };
}

function splitTableRow(row) {
  let value = row.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);

  const cells = [];
  let current = "";
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === "|") {
      cells.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current);
  return cells;
}

function parseInline(text) {
  const codeTokens = [];
  const linkTokens = [];
  const imageTokens = [];

  let output = text
    .replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, (_, alt, url, title) => {
      const token = `@@IMAGETOKEN${imageTokens.length}@@`;
      imageTokens.push(`<img src="${safeUrl(url)}" alt="${escapeAttribute(alt)}"${title ? ` title="${escapeAttribute(title)}"` : ""}>`);
      return token;
    })
    .replace(/`([^`]+)`/g, (_, code) => {
      const token = `@@CODETOKEN${codeTokens.length}@@`;
      codeTokens.push(`<code>${escapeHtml(code)}</code>`);
      return token;
    })
    .replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, (_, label, url, title) => {
      const token = `@@LINKTOKEN${linkTokens.length}@@`;
      linkTokens.push(`<a href="${safeUrl(url)}"${title ? ` title="${escapeAttribute(title)}"` : ""} target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
      return token;
    });

  output = escapeHtml(output)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>")
    .replace(/ {2}\n/g, "<br>");

  codeTokens.forEach((html, index) => {
    output = output.replace(`@@CODETOKEN${index}@@`, html);
  });

  linkTokens.forEach((html, index) => {
    output = output.replace(`@@LINKTOKEN${index}@@`, html);
  });

  imageTokens.forEach((html, index) => {
    output = output.replace(`@@IMAGETOKEN${index}@@`, html);
  });

  return output;
}

function renderFrontMatter(lines) {
  const entries = lines
    .map((line) => {
      const match = line.match(/^([^:#][^:]*):\s*(.*)$/);
      return match ? [match[1].trim(), match[2].trim()] : null;
    })
    .filter(Boolean);

  if (!entries.length) return "";

  return `<dl class="front-matter">${entries
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${parseInline(value)}</dd>`)
    .join("")}</dl>`;
}

function renderTableOfContents(headings) {
  if (!headings.length) {
    toc.innerHTML = '<p class="muted">Este documento no contiene encabezados.</p>';
    return;
  }

  toc.innerHTML = `<ul>${headings
    .map(({ level, text, id }) => `<li class="level-${level}"><a href="#${escapeAttribute(id)}" data-heading-id="${escapeAttribute(id)}" title="${escapeAttribute(text)}">${escapeHtml(text)}</a></li>`)
    .join("")}</ul>`;
}

function observeHeadings() {
  if (headingObserver) headingObserver.disconnect();

  const headingElements = [...documentView.querySelectorAll("h1, h2, h3, h4, h5, h6")];
  if (!headingElements.length) return;

  headingObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (!visible.length) return;
      const currentId = visible[0].target.id;
      toc.querySelectorAll("a").forEach((link) => {
        link.classList.toggle("active", link.dataset.headingId === currentId);
      });
    },
    { rootMargin: "-90px 0px -72% 0px", threshold: [0, 1] }
  );

  headingElements.forEach((heading) => headingObserver.observe(heading));
}

function stripInlineMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

function uniqueSlug(text, usedIds) {
  const base = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "seccion";

  const count = usedIds.get(base) || 0;
  usedIds.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function safeUrl(url) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:|#|\.\.?\/|\/)/i.test(trimmed)) {
    return escapeAttribute(trimmed);
  }
  return "#";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function initializeTheme() {
  const storedTheme = localStorage.getItem("md-reader-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("md-reader-theme", next);

  if (documentView.querySelector("[data-mermaid-diagram]")) {
    void renderMermaidDiagrams();
  }
}

function changeFontSize(delta) {
  fontSize = Math.min(24, Math.max(14, fontSize + delta));
  localStorage.setItem("md-reader-font-size", String(fontSize));
  applyFontSize();
}

function applyFontSize() {
  document.documentElement.style.setProperty("--reader-font-size", `${fontSize}px`);
}

function showStatus(message, isError = false) {
  fileStatus.textContent = message;
  fileStatus.style.color = isError ? "#dc2626" : "";
  window.setTimeout(() => {
    fileStatus.style.color = "";
  }, 3000);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

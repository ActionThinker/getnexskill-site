/* GetNexSkill 课程页 · 本地交互逻辑
 * 数据：window.GETNEXSKILL_COURSE（course-data.js）
 * 存储：localStorage（仅本机；不上传）
 */
(function () {
  "use strict";

  const D = window.GETNEXSKILL_COURSE;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const LS = {
    unlock: "getnexskill_unlock",
    progress: "getnexskill_progress",
    retrain: "getnexskill_retrain",
    rubric: "getnexskill_rubric",
    profile: "getnexskill_profile",
    works: "getnexskill_works"
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("已复制");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("已复制"); } catch (err) { toast("复制失败，请手动选择"); }
      ta.remove();
    }
  }
  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- gate ----------
  function showApp() {
    $("#gate").classList.add("hidden");
    $("#app").classList.remove("hidden");
    renderAll();
  }
  function initGate() {
    const unlocked = localStorage.getItem(LS.unlock) === D.meta.accessCode;
    if (unlocked) { showApp(); return; }
    $("#gate-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const val = ($("#access-code").value || "").trim();
      if (val === D.meta.accessCode) {
        localStorage.setItem(LS.unlock, D.meta.accessCode);
        $("#gate-error").textContent = "";
        showApp();
        toast("欢迎进入 GetNexSkill");
      } else {
        $("#gate-error").textContent = "课程码不对，请找讲师/助教确认。";
        $("#access-code").select();
      }
    });
  }

  // ---------- hero ----------
  function renderHero() {
    $("#nav-course").textContent = D.meta.course.replace("GetNexSkill 课程包 · ", "");
    $("#nav-date").textContent = D.meta.date;
    const caps = [
      ["C1", "画像", "帮我做岗位 AI 画像", "T0"],
      ["C2", "选题", "找出我最该先做的 3 个场景", "T1"],
      ["C3", "升级", "把这个任务升级成「让结果发生」", "T2"],
      ["C4", "知识库", "建一个懂我们公司的知识库助手", "T3"],
      ["C5", "智能体", "搭一个岗位智能体", "T4"],
      ["C6", "通关", "生成我的作品卡和 1 分钟路演", "T7"]
    ];
    $("#hero-caps").innerHTML = caps.map(([id, label, text, task]) =>
      `<div class="cap" data-task="${task}" role="button" tabindex="0">
        <small>${id} · ${label}</small>${text}
      </div>`).join("");
    $$("#hero-caps .cap").forEach((el) => {
      const open = () => {
        const taskId = el.dataset.task;
        const card = document.getElementById("task-" + taskId);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          const d = card.querySelector("details");
          if (d) d.open = true;
          card.classList.add("flash");
          setTimeout(() => card.classList.remove("flash"), 1200);
        }
      };
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    $("#hero-modes").innerHTML = [
      ["练手", "现场带练"], ["复训", "每天 15 分钟"], ["通关", "能力验收"], ["案例场", "找灵感"]
    ].map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join("");
  }

  // ---------- agenda ----------
  function renderAgenda() {
    $("#agenda-list").innerHTML = D.agenda.map((a) =>
      `<div class="agenda-item">
        <div class="agenda-time">${escapeHtml(a.time)}</div>
        <div><div class="agenda-title">${escapeHtml(a.title)}</div><div class="agenda-note">${escapeHtml(a.note || "")}</div></div>
        <div class="agenda-mode">${escapeHtml(a.mode)}</div>
      </div>`).join("");
  }

  // ---------- tasks ----------
  function getProgress() { return load(LS.progress, {}); }
  function setProgress(p) { save(LS.progress, p); updatePracticeProgress(); updateMe(); }
  function isDone(id) { const p = getProgress(); return !!(p[id] && p[id].done); }

  function renderTasks(filter) {
    filter = filter || "all";
    const list = D.tasks.filter((t) => {
      if (filter === "all") return true;
      if (filter === "练手") return t.mode === "练手";
      if (filter === "通关") return t.mode === "通关";
      if (filter === "进阶") return (t.level || "").indexOf("进阶") >= 0 || (t.level || "").indexOf("挑战") >= 0;
      return true;
    });
    const progress = getProgress();
    $("#task-grid").innerHTML = list.map((t) => {
      const p = progress[t.id] || {};
      const checks = p.checks || [];
      const done = !!p.done;
      return `<article class="task-card ${done ? "done" : ""}" id="task-${t.id}" data-id="${t.id}">
        <div class="task-head">
          <div><div class="task-id">${t.id} · ${escapeHtml(t.capsule)}</div><h3 class="task-title">${escapeHtml(t.title)}</h3></div>
          <div class="task-badges">
            <span class="badge badge-mode">${escapeHtml(t.mode)}</span>
            <span class="badge">${escapeHtml(t.level)}</span>
            ${done ? '<span class="badge badge-done">已完成</span>' : ""}
          </div>
        </div>
        <div class="task-meta">${t.duration} 分钟 · ${escapeHtml(t.agent)} · ${escapeHtml(t.skill)}</div>
        <p class="task-goal">${escapeHtml(t.goal)}</p>
        <details class="task-details">
          <summary>查看材料 / 步骤 / 交代文本 / 验收</summary>
          <div class="detail-body">
            <p><b>准备材料：</b>${escapeHtml(t.materials)}</p>
            <p><b>步骤：</b></p><ol>${t.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
            <p><b>交代文本：</b></p>
            <div class="prompt-box">${escapeHtml(t.prompt)}</div>
            <p><b>验收标准：</b></p>
            <ul class="acceptance">${t.acceptance.map((a, i) =>
              `<li><input type="checkbox" data-task="${t.id}" data-idx="${i}" ${checks[i] ? "checked" : ""}> <span>${escapeHtml(a)}</span></li>`).join("")}</ul>
            <div class="task-fallback"><b>兜底：</b>${escapeHtml(t.fallback)}</div>
          </div>
        </details>
        <div class="task-actions">
          <button class="btn btn-ghost" type="button" data-copy="${t.id}">复制交代文本</button>
          <button class="btn ${done ? "btn-ghost" : "btn-primary"}" type="button" data-done="${t.id}">${done ? "取消完成" : "标记完成"}</button>
        </div>
      </article>`;
    }).join("");

    $$("#task-grid [data-copy]").forEach((b) => b.addEventListener("click", () => {
      const t = D.tasks.find((x) => x.id === b.dataset.copy);
      if (t) copyText(t.prompt);
    }));
    $$("#task-grid [data-done]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.done;
      const p = getProgress();
      p[id] = p[id] || {};
      p[id].done = !p[id].done;
      setProgress(p);
      renderTasks(currentFilter);
      toast(p[id].done ? "已标记完成：" + id : "已取消完成：" + id);
    }));
    $$("#task-grid input[type=checkbox]").forEach((cb) => cb.addEventListener("change", () => {
      const id = cb.dataset.task;
      const idx = Number(cb.dataset.idx);
      const p = getProgress();
      p[id] = p[id] || {};
      p[id].checks = p[id].checks || [];
      p[id].checks[idx] = cb.checked;
      save(LS.progress, p);
    }));
    updatePracticeProgress();
  }

  let currentFilter = "all";
  function updatePracticeProgress() {
    const done = D.tasks.filter((t) => isDone(t.id)).length;
    const el = $("#practice-progress");
    if (el) el.textContent = `${done} / ${D.tasks.length} 完成`;
  }

  // ---------- rubric ----------
  function getRubric() { return load(LS.rubric, {}); }
  function renderRubric() {
    const scores = getRubric();
    $("#rubric").innerHTML = D.rubric.map((r) =>
      `<div class="rubric-row">
        <div><div class="rubric-label">${escapeHtml(r.label)}</div><div class="rubric-hint">${escapeHtml(r.hint)}</div></div>
        <div class="score-buttons" data-rubric="${r.id}">
          ${[0, 1, 2].map((n) => `<button type="button" data-score="${n}" class="${scores[r.id] === n ? "active" : ""}">${n}</button>`).join("")}
        </div>
      </div>`).join("");
    $$("#rubric [data-score]").forEach((b) => b.addEventListener("click", () => {
      const row = b.closest("[data-rubric]");
      const id = row.dataset.rubric;
      const score = Number(b.dataset.score);
      const scores2 = getRubric();
      scores2[id] = score;
      save(LS.rubric, scores2);
      $$("button", row).forEach((x) => x.classList.toggle("active", Number(x.dataset.score) === score));
      updateRubricTotal();
      updateMe();
    }));
    updateRubricTotal();
  }
  function rubricTotal() {
    const scores = getRubric();
    let total = 0, set = 0;
    D.rubric.forEach((r) => { if (typeof scores[r.id] === "number") { total += scores[r.id]; set++; } });
    return { total, set, pass: set === D.rubric.length && total >= 7 };
  }
  function updateRubricTotal() {
    const { total, set, pass } = rubricTotal();
    const el = $("#rubric-total");
    if (!el) return;
    if (set < D.rubric.length) {
      el.textContent = `总分：${total} / 10 · 待评（${set}/${D.rubric.length}）`;
      el.className = "rubric-total";
    } else {
      el.textContent = `总分：${total} / 10 · ${pass ? "通过（课程内通关）" : "待补练（看下方补练卡）"}`;
      el.className = "rubric-total " + (pass ? "pass" : "fail");
    }
  }

  // ---------- retrain ----------
  function getRetrain() { return load(LS.retrain, {}); }
  function renderRetrain() {
    const checks = getRetrain();
    $("#retrain-grid").innerHTML = D.retrain.map((d) =>
      `<div class="retrain-day ${checks[d.day] ? "done" : ""}" data-day="${escapeHtml(d.day)}">
        <b>${escapeHtml(d.day)}</b>
        <span>${escapeHtml(d.title)}</span>
        <span style="font-size:10px;color:var(--muted)">${escapeHtml(d.desc)}</span>
        <input type="checkbox" ${checks[d.day] ? "checked" : ""} aria-label="${escapeHtml(d.day)} 打卡">
      </div>`).join("");
    $$("#retrain-grid input[type=checkbox]").forEach((cb) => cb.addEventListener("change", () => {
      const day = cb.closest("[data-day]").dataset.day;
      const c = getRetrain();
      c[day] = cb.checked;
      save(LS.retrain, c);
      cb.closest("[data-day]").classList.toggle("done", cb.checked);
      updateRetrainStreak();
      updateMe();
    }));
    updateRetrainStreak();
  }
  function updateRetrainStreak() {
    const c = getRetrain();
    const n = Object.keys(c).filter((k) => c[k]).length;
    const el = $("#retrain-streak");
    if (el) el.textContent = `${n} / ${D.retrain.length} 天`;
  }

  // ---------- cases / works / paths ----------
  function renderCases() {
    $("#case-grid").innerHTML = D.cases.map((c) =>
      `<article class="case-card">
        <div class="case-industry">${escapeHtml(c.industry)} · ${escapeHtml(c.type)}</div>
        <h3 class="case-title">${escapeHtml(c.title)}</h3>
        <div class="case-row"><b>场景：</b>${escapeHtml(c.scenario)}</div>
        <div class="case-row"><b>做法：</b>${escapeHtml(c.approach)}</div>
        <div class="case-row"><b>产出：</b>${escapeHtml(c.output)}</div>
        <div class="case-row"><b>复用：</b>${escapeHtml(c.reuse)}</div>
        <button class="btn btn-ghost" type="button" data-case="${escapeHtml(c.id)}">改造这个案例</button>
      </article>`).join("");
    $$("#case-grid [data-case]").forEach((b) => b.addEventListener("click", () => {
      const c = D.cases.find((x) => x.id === b.dataset.case);
      if (!c) return;
      copyText(`请帮我把这个案例改造成我的岗位版本：\n案例：${c.title}\n做法：${c.approach}\n要求：换对象/部门/输出格式，保留方法；先给 L1 选题单。`);
      document.getElementById("practice").scrollIntoView({ behavior: "smooth" });
    }));
  }

  function allWorks() {
    const submitted = load(LS.works, []);
    return submitted.concat(D.works);
  }
  function renderWorks() {
    $("#works-grid").innerHTML = allWorks().map((w) =>
      `<article class="work-card">
        <div class="work-tag">${escapeHtml(w.tag || "作品")}</div>
        <h4 class="work-title">${escapeHtml(w.title)}</h4>
        <p class="work-desc">${escapeHtml(w.desc)}</p>
        <div class="work-by">${escapeHtml(w.name)} · ${escapeHtml(w.role)}${w.link ? ` · <a href="${escapeHtml(w.link)}" target="_blank" rel="noopener">证据</a>` : ""}</div>
      </article>`).join("");
  }

  function renderPaths() {
    $("#paths").innerHTML = D.paths.map((p) =>
      `<article class="path-card">
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.desc)}</p>
        <a class="btn btn-ghost" href="mailto:${escapeHtml(p.contact)}?subject=${encodeURIComponent("GetNexSkill · " + p.title)}">${escapeHtml(p.action)}</a>
      </article>`).join("");
  }

  // ---------- me ----------
  function getProfile() { return load(LS.profile, {}); }
  function renderMe() {
    const p = getProfile();
    if ($("#me-name") && !$("#me-name").value) $("#me-name").value = p.name || "";
    if ($("#me-role") && !$("#me-role").value) $("#me-role").value = p.role || "";
    updateMe();
  }
  function updateMe() {
    const done = D.tasks.filter((t) => isDone(t.id)).length;
    const retrain = Object.keys(getRetrain()).filter((k) => getRetrain()[k]).length;
    const { total, set, pass } = rubricTotal();
    const stats = $("#me-stats");
    if (stats) {
      stats.innerHTML = `<div><b>${done}/8</b><span>任务完成</span></div>
        <div><b>${retrain}/14</b><span>复训打卡</span></div>
        <div><b>${set === 5 ? total : "—"}</b><span>通关分</span></div>`;
    }
    const pf = $("#portfolio");
    if (pf) {
      const items = D.tasks.filter((t) => isDone(t.id));
      pf.innerHTML = items.length
        ? items.map((t) => `<div class="portfolio-item"><b>${t.id} · ${escapeHtml(t.title)}</b><br>${escapeHtml(t.goal)}</div>`).join("")
        : '<div class="portfolio-empty">还没有完成的任务。去「练手」标记第一张卡。</div>';
    }
  }
  function bindMe() {
    ["me-name", "me-role"].forEach((id) => {
      const el = $("#" + id);
      if (el) el.addEventListener("input", () => {
        const p = getProfile();
        p[id === "me-name" ? "name" : "role"] = el.value;
        save(LS.profile, p);
      });
    });
    $("#export-json").addEventListener("click", () => {
      const payload = {
        product: D.meta.product, course: D.meta.course, exportedAt: new Date().toISOString(),
        profile: getProfile(),
        progress: getProgress(),
        retrain: getRetrain(),
        rubric: getRubric(),
        works: load(LS.works, [])
      };
      download(`getnexskill-portfolio-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
      toast("已导出 JSON");
    });
    $("#export-md").addEventListener("click", () => {
      const p = getProfile();
      const done = D.tasks.filter((t) => isDone(t.id));
      const retrain = Object.keys(getRetrain()).filter((k) => getRetrain()[k]);
      const { total, set, pass } = rubricTotal();
      const md = `# GetNexSkill 学习记录\n\n- 姓名：${p.name || "（未填）"}\n- 岗位：${p.role || "（未填）"}\n- 课程：${D.meta.course}\n- 日期：${D.meta.date}\n\n## 完成任务（${done.length}/8）\n${done.map((t) => `- [x] ${t.id} ${t.title}`).join("\n") || "- 暂无"}\n\n## 复训打卡（${retrain.length}/14）\n${retrain.join("、") || "暂无"}\n\n## 通关自评\n${set === 5 ? `总分 ${total}/10 · ${pass ? "通过" : "待补练"}` : "未完成"}\n\n## 下一步\n- 选一条毕业后路径：个人继续 / 团队企业版 / 深度定制\n- 联系：${D.meta.contact}\n`;
      download(`getnexskill-portfolio-${new Date().toISOString().slice(0, 10)}.md`, md, "text/markdown;charset=utf-8");
      toast("已导出 Markdown");
    });
    $("#reset-progress").addEventListener("click", () => {
      if (!confirm("确定清空本机的任务/复训/通关进度？作品和姓名会保留。")) return;
      [LS.progress, LS.retrain, LS.rubric].forEach((k) => localStorage.removeItem(k));
      renderTasks(currentFilter); renderRetrain(); renderRubric(); updateMe();
      toast("进度已重置");
    });
  }

  // ---------- work form ----------
  function bindWorkForm() {
    const form = $("#work-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = ($("#wf-name").value || "").trim() || "学员";
      const role = ($("#wf-role").value || "").trim() || "—";
      const title = ($("#wf-title").value || "").trim() || "未命名作品";
      const desc = ($("#wf-desc").value || "").trim() || "—";
      const link = ($("#wf-link").value || "").trim();
      const works = load(LS.works, []);
      works.unshift({ name, role, title, desc, link, tag: "新提交" });
      save(LS.works, works);
      renderWorks();
      const body = `GetNexSkill 作品卡\n\n姓名：${name}\n岗位：${role}\n作品：${title}\n亮点：${desc}\n证据：${link || "（无）"}\n\n课程：${D.meta.course}\n日期：${D.meta.date}`;
      window.location.href = `mailto:${D.meta.contact}?subject=${encodeURIComponent("GetNexSkill 作品卡 · " + title)}&body=${encodeURIComponent(body)}`;
      toast("作品已记录，正在打开邮件提交");
      form.reset();
    });
  }

  // ---------- nav active ----------
  function initNav() {
    const links = $$(".nav-links a");
    const map = {};
    links.forEach((a) => { map[a.getAttribute("href").slice(1)] = a; });
    const sections = ["agenda", "practice", "checkpoint", "retrain", "cases", "me"].map((id) => document.getElementById(id)).filter(Boolean);
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((a) => a.classList.remove("active"));
          const a = map[en.target.id];
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -55% 0px", threshold: 0 });
    sections.forEach((s) => io.observe(s));
  }

  // ---------- init ----------
  function renderAll() {
    renderHero();
    renderAgenda();
    renderTasks("all");
    renderRubric();
    renderRetrain();
    renderCases();
    renderWorks();
    renderPaths();
    renderMe();
  }

  function init() {
    if (!D) {
      document.body.innerHTML = "<p style='padding:24px;font-family:sans-serif'>课程数据未加载：请检查 course-data.js。</p>";
      return;
    }
    document.title = D.meta.product + " · " + D.meta.course.replace("GetNexSkill 课程包 · ", "");
    initGate();
    bindMe();
    bindWorkForm();
    initNav();
    $$("#task-filter .chip").forEach((btn) => btn.addEventListener("click", () => {
      $$("#task-filter .chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks(currentFilter);
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

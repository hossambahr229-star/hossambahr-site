import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const html=fs.readFileSync(new URL("../../index.html",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../../premium-platform.css",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../../premium-platform.js",import.meta.url),"utf8");
test("homepage is platform-first with functional discovery",()=>{assert.match(html,/معاملتك في الإمارات/);assert.match(html,/premium-intent-search/);assert.match(html,/اختر الإمارة/);for(const e of["دبي","أبوظبي","الشارقة","عجمان","رأس الخيمة","الفجيرة","أم القيوين"])assert.ok(html.includes(e),e);assert.doesNotMatch(html,/<h1[^>]*>HOSSAM BAHR AI/);});
test("AI is a persistent secondary side assistant",()=>{assert.match(html,/premium-ai-orb/);assert.match(html,/premium-ai-panel/);assert.match(html,/hero-search-stage/);assert.match(html,/primary-search/);assert.match(js,/aria-hidden/);assert.match(js,/Escape/);});
test("premium story is accessible and motion-safe",()=>{assert.equal((html.match(/<article class="premium-slide/g)||[]).length,5);assert.match(css,/prefers-reduced-motion/);assert.match(js,/prefers-reduced-motion/);assert.match(html,/aria-roledescription="carousel"/);});
test("premium surface avoids fabricated partnership language and exposes real counts only",()=>{assert.doesNotMatch(html,/شركاؤنا/);assert.match(html,/<b>200<\/b> خدمة فعلية/);assert.match(html,/<b>7\/7<\/b> إمارات/);assert.match(html,/<b>20<\/b> جهة/);});
test("responsive release breakpoints cover phone and tablet classes",()=>{for(const bp of["1100","720","390"])assert.ok(css.includes("@media(max-width:"+bp+"px)"),bp);assert.match(css,/overflow:hidden/);});

test("publication stabilizer preserves premium platform hero",()=>{const s=fs.readFileSync(new URL("../../src/publication/stabilize-homepage-runtime.mjs",import.meta.url),"utf8");assert.match(s,/!html\.includes\('premium-home-hero'\)/);});

test("closed AI panel never blocks underlying platform controls",()=>{assert.match(css,/premium-ai-panel[^}]*pointer-events:none[^}]*visibility:hidden/);assert.match(css,/premium-ai-panel\.is-open[^}]*pointer-events:auto[^}]*visibility:visible/);});

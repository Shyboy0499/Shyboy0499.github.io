// Jianghu World 的 DOM 场景：负责江湖世界 UI、人物对话和访客移动。
// Runtime 负责生命周期；本文件只持有 DOM、局部状态和 sprite 路径。
import { WORLD_NAMING } from "../worlds.config";
import type { PortalJourneyState } from "../../runtime/contracts";
import {
  JIANGHU_AGENTS,
  JIANGHU_PORTAL_AGENT_ID,
  JIANGHU_SCENE_SIZE,
  JIANGHU_SCENES,
  type JianghuAgentSpec,
  type JianghuSpritePose,
} from "./jianghu-agents.config";

interface VisitState {
  id: string;
  start: number;
  end: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  returning: boolean;
}

interface DialogueState {
  agent: JianghuAgentSpec;
  lineIndex: number;
  lines: readonly string[];
}

const SCENE_W = JIANGHU_SCENE_SIZE.width;
const SCENE_H = JIANGHU_SCENE_SIZE.height;

// 对话层遮罩使用连续渐变而不是 backdrop-filter，避免矩形模糊边缘形成硬接缝。
const css = `
.jianghu-world-root{position:fixed;inset:0;z-index:82;overflow:hidden;background:#070b12;color:#ead9ae;user-select:none}
.jianghu-world-root *{box-sizing:border-box}
.jianghu-stage-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 38%,#182826,#06070d 72%)}
.jianghu-stage-wrap:after{content:"";position:absolute;inset:-25%;z-index:40;pointer-events:none;opacity:0;background:radial-gradient(circle at 88% 10%,rgba(255,246,211,.92) 0 2%,rgba(229,190,119,.38) 8%,rgba(137,242,255,.12) 21%,transparent 46%);transform:scale(.35);transform-origin:88% 10%;transition:opacity .36s ease,transform .46s cubic-bezier(.2,.8,.2,1)}
.jianghu-stage{position:relative;width:min(100vw,calc(100vh * 1.846));aspect-ratio:1920/1040;overflow:hidden;box-shadow:0 0 120px rgba(0,0,0,.65);transition:transform .46s cubic-bezier(.2,.8,.2,1),filter .46s ease}
.jianghu-stage-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
.jianghu-vignette{position:absolute;inset:0;z-index:20;pointer-events:none;background:radial-gradient(ellipse at center,transparent 48%,rgba(0,0,0,.52) 100%),linear-gradient(180deg,rgba(8,23,20,.28),transparent 24%,rgba(7,11,18,.5))}
.jianghu-agent{position:absolute;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:pointer;transition:left 3.8s linear,top 3.8s linear,opacity .4s,filter .4s;z-index:10;appearance:none;border:0;background:transparent;padding:0;margin:0;color:inherit;font:inherit}
.jianghu-agent:focus-visible{outline:2px solid #89f2ff;outline-offset:8px}
.jianghu-agent.is-offline{opacity:.38;filter:grayscale(.85)}
.jianghu-shadow{position:absolute;left:50%;bottom:7px;width:38px;height:10px;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.34);filter:blur(2px)}
.jianghu-sprite{position:relative;width:54px;height:72px;animation:jianghu-breathe 3s ease-in-out infinite;filter:drop-shadow(0 5px 3px rgba(0,0,0,.42))}
.jianghu-agent.is-busy .jianghu-sprite{animation:jianghu-breathe 1.5s ease-in-out infinite,jianghu-work .7s steps(2) infinite}
.jianghu-sprite img{width:100%;height:100%;object-fit:contain;object-position:center bottom;display:block}
.jianghu-name{margin-top:2px;padding:2px 8px 3px;font:850 10px/1.35 Segoe UI,Microsoft YaHei,sans-serif;color:#f5e7be;background:rgba(14,17,19,.88);border:1px solid rgba(201,160,99,.45);box-shadow:0 2px 6px rgba(0,0,0,.5);letter-spacing:.08em;white-space:nowrap}
.jianghu-agent.is-world-guide .jianghu-name{color:#fff8df;border-color:rgba(236,72,153,.72);box-shadow:0 0 0 1px rgba(255,244,214,.12),0 0 20px rgba(236,72,153,.32)}
.jianghu-guide-hint{position:absolute;bottom:88px;left:50%;display:none;transform:translateX(-50%);padding:5px 9px;color:#1a1712;background:#fff8df;border:1px solid #ec4899;font:900 10px/1.35 Segoe UI,Microsoft YaHei,sans-serif;white-space:nowrap;box-shadow:3px 3px 0 rgba(8,12,15,.7)}
.jianghu-agent.is-world-guide.is-near-guest .jianghu-guide-hint{display:block;animation:jianghu-guide-hint 1.4s ease-in-out infinite}
.jianghu-world-root.is-dialog-open .jianghu-guide-hint{display:none}
.jianghu-bubble{position:absolute;bottom:82px;left:50%;transform:translateX(-50%);max-width:230px;padding:5px 9px;background:rgba(12,18,20,.94);border:1px solid rgba(137,242,255,.48);color:#f7fbff;font:700 12px/1.35 Segoe UI,Microsoft YaHei,sans-serif;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.38);animation:jianghu-bubble 2.6s ease-in-out infinite}
.jianghu-bubble:after{content:"";position:absolute;left:50%;bottom:-5px;transform:translateX(-50%);border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid rgba(20,14,8,.94)}
.jianghu-guest{position:absolute;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);z-index:999;pointer-events:none}
.jianghu-guest img{width:56px;height:76px;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 5px 3px rgba(0,0,0,.42))}
.jianghu-controls{position:absolute;z-index:45;right:18px;top:18px;display:flex;gap:8px}
.jianghu-controls button{background:rgba(16,37,34,.92);border:2px solid rgba(217,201,155,.45);color:#d9c99b;font-size:11px;font-weight:900;letter-spacing:.12em;padding:7px 12px;cursor:pointer;box-shadow:2px 2px 0 rgba(2,8,7,.9)}
.jianghu-controls button:hover{border-color:#f2b84b;color:#fff7dc;transform:translate(-1px,-1px);box-shadow:3px 3px 0 rgba(2,8,7,.9)}
.jianghu-help{position:absolute;z-index:45;left:26px;bottom:22px;color:rgba(232,217,176,.72);font:800 10px/1.6 Segoe UI,Microsoft YaHei,sans-serif;letter-spacing:.14em;text-shadow:0 2px 8px #000}
.jianghu-mobile-controls{position:absolute;z-index:46;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));display:none;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:5px;pointer-events:auto}
.jianghu-mobile-controls button{display:grid;place-items:center;min-width:44px;min-height:44px;padding:0;border:1px solid rgba(232,217,176,.58);border-radius:4px;background:rgba(9,25,25,.9);color:#fff7dc;font:900 18px/1 Segoe UI,Microsoft YaHei,sans-serif;touch-action:none;box-shadow:0 5px 16px rgba(0,0,0,.38)}
.jianghu-mobile-controls button[data-jianghu-move="up"]{grid-column:2}
.jianghu-mobile-controls button[data-jianghu-move="left"]{grid-column:1;grid-row:2}
.jianghu-mobile-controls button[data-jianghu-move="down"]{grid-column:2;grid-row:2}
.jianghu-mobile-controls button[data-jianghu-move="right"]{grid-column:3;grid-row:2}
.jianghu-mobile-controls button[data-jianghu-talk]{grid-column:3;grid-row:1;color:#89f2ff}
.jianghu-mobile-controls button:active{border-color:#89f2ff;background:rgba(24,62,58,.96)}
.jianghu-world-root[data-portal-state="preparing"] .jianghu-stage,.jianghu-world-root[data-portal-state="crossing"] .jianghu-stage{transform:scale(1.035);filter:saturate(.78) brightness(1.12)}
.jianghu-world-root[data-portal-state="preparing"] .jianghu-stage-wrap:after,.jianghu-world-root[data-portal-state="crossing"] .jianghu-stage-wrap:after{opacity:1;transform:scale(1)}
.jianghu-world-root[data-portal-state="preparing"] .jianghu-controls,.jianghu-world-root[data-portal-state="preparing"] .jianghu-help{opacity:0;transition:opacity .18s}
.jianghu-world-root.is-dialog-open .jianghu-agent,.jianghu-world-root.is-dialog-open .jianghu-guest{pointer-events:none}
.jianghu-world-root.is-dialog-open .jianghu-agent .jianghu-bubble,.jianghu-world-root.is-dialog-open .jianghu-guest .jianghu-bubble{display:none}
.jianghu-dialog{position:absolute;inset:0;z-index:3000;pointer-events:auto;cursor:pointer;background:linear-gradient(180deg,rgba(5,8,12,.08),rgba(5,8,12,.22) 42%,rgba(5,8,12,.48) 100%)}
.jianghu-dialog[hidden]{display:none}
.jianghu-dialog-close{position:absolute;right:24px;top:20px;z-index:5;width:30px;height:30px;display:grid;place-items:center;border:0;background:rgba(5,8,12,.18);color:rgba(232,217,176,.48);font:500 24px/1 Segoe UI,Arial,sans-serif;cursor:pointer;opacity:.55}
.jianghu-dialog-close:hover,.jianghu-dialog-close:focus-visible{color:#fff7dc;background:rgba(5,8,12,.42);opacity:1;outline:1px solid rgba(137,242,255,.34);outline-offset:2px}
.jianghu-dialog-portrait{position:absolute;bottom:34px;z-index:1;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0;pointer-events:none}
.jianghu-dialog-portrait.left{left:7%;width:min(28vw,410px)}
.jianghu-dialog-portrait.right{right:4%;width:min(35vw,560px)}
.jianghu-dialog-portrait{transition:opacity .28s ease,filter .28s ease,transform .28s ease}
.jianghu-dialog-portrait img{max-width:100%;max-height:min(72vh,690px);object-fit:contain;object-position:center bottom;filter:drop-shadow(0 22px 18px rgba(0,0,0,.6));transition:filter .28s ease,opacity .28s ease}
.jianghu-dialog-portrait.left img{max-height:min(54vh,520px);transform:scaleX(-1)}
.jianghu-dialog-portrait.is-speaking{opacity:1;filter:saturate(1.1) brightness(1.08)}
.jianghu-dialog-portrait.is-speaking img{filter:drop-shadow(0 22px 18px rgba(0,0,0,.62)) drop-shadow(0 0 18px rgba(255,237,174,.18))}
.jianghu-dialog-portrait.is-muted{opacity:.58;filter:saturate(.68) brightness(.64)}
.jianghu-dialog-portrait.is-muted img{filter:drop-shadow(0 18px 16px rgba(0,0,0,.62))}
.jianghu-dialog-portrait strong{padding:5px 13px;background:rgba(8,13,16,.84);border:1px solid rgba(232,217,176,.42);color:#fff7dc;font:900 14px/1.2 Segoe UI,Microsoft YaHei,sans-serif;letter-spacing:.08em}
.jianghu-dialog-portrait span{color:#89f2ff;font:800 11px/1.2 Segoe UI,Microsoft YaHei,sans-serif;letter-spacing:.12em;text-shadow:0 2px 8px #001014}
.jianghu-subtitle{position:absolute;left:0;right:0;bottom:0;z-index:3;min-height:34vh;padding:78px min(19vw,360px) 42px;background:linear-gradient(180deg,rgba(7,8,10,.16) 0%,rgba(7,8,10,.48) 22%,rgba(7,8,10,.82) 48%,rgba(7,8,10,.94) 100%);box-shadow:none;backdrop-filter:none;overflow:visible}
.jianghu-subtitle:before{content:"";position:absolute;left:0;right:0;bottom:100%;height:clamp(120px,16vh,190px);pointer-events:none;background:linear-gradient(180deg,rgba(7,8,10,0) 0%,rgba(7,8,10,.025) 26%,rgba(7,8,10,.07) 52%,rgba(7,8,10,.12) 76%,rgba(7,8,10,.16) 100%)}
.jianghu-subtitle:after{display:none}
.jianghu-subtitle header{position:relative;z-index:1;display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:14px;margin:0 auto 12px;max-width:980px}
.jianghu-subtitle strong{color:#f4d37b;font:950 clamp(20px,2.2vw,34px)/1.1 "Kaiti SC","STKaiti","KaiTi",serif;letter-spacing:.08em;text-shadow:0 3px 8px #000}
.jianghu-subtitle small{color:rgba(137,242,255,.82);font:850 12px/1 Segoe UI,Microsoft YaHei,sans-serif;letter-spacing:.18em}
.jianghu-subtitle p{position:relative;z-index:1;max-width:980px;min-height:72px;margin:0 auto;padding-right:130px;color:#fff8df;font:850 clamp(24px,2.4vw,40px)/1.55 "Kaiti SC","STKaiti","KaiTi",serif;text-shadow:0 3px 8px #000,0 0 1px #000}
@media (max-width: 760px){
  .jianghu-controls{top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right))}
  .jianghu-controls button{min-height:44px;padding:7px 10px;font-size:10px}
  .jianghu-help{display:none}
  .jianghu-mobile-controls{display:grid}
  .jianghu-dialog-portrait.left{left:2%;width:34vw}
  .jianghu-dialog-portrait.right{right:-4%;width:46vw}
  .jianghu-subtitle{min-height:32vh;padding:56px 22px 32px}
  .jianghu-subtitle:before{height:clamp(88px,14vh,130px)}
  .jianghu-subtitle header,.jianghu-subtitle p{max-width:none}
  .jianghu-subtitle p{padding-right:0;font-size:22px}
  .jianghu-dialog-close{right:14px;top:14px}
}
@keyframes jianghu-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes jianghu-work{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}}
@keyframes jianghu-bubble{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-4px)}}
@keyframes jianghu-guide-hint{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-5px)}}
html[data-world="jianghu"],html[data-world="jianghu"] body{overflow:hidden}
html[data-world="jianghu"] .site-header,html[data-world="jianghu"] .route-rail,html[data-world="jianghu"] .story,html[data-world="jianghu"] .contact{opacity:0;pointer-events:none}
html[data-world="jianghu"]:not([data-portal-journey]) .portal-layer{opacity:0;pointer-events:none}
`;

export class JianghuScene {
  readonly root: HTMLElement;
  onFocusChange: ((agentId: string | null) => void) | null = null;
  private readonly baseUrl: string;
  private readonly onRequestPortal: () => void;
  private readonly style: HTMLStyleElement;
  private readonly agentEls = new Map<string, HTMLElement>();
  private readonly spriteEls = new Map<string, HTMLImageElement>();
  private readonly bubbleEls = new Map<string, HTMLElement>();
  private readonly agents = JIANGHU_AGENTS.map((agent) => ({ ...agent, xNow: agent.x, yNow: agent.y }));
  private readonly keys = new Set<string>();
  private visit: VisitState | null = null;
  private dialogue: DialogueState | null = null;
  private nextSceneAt = 2.5;
  private guest = { seated: false, x: 960, y: 1000, frame: 0, facing: 1 };
  private paused = false;
  private disposed = false;

  constructor(
    baseUrl: string,
    onRequestGuest: () => void = () => undefined,
    onRequestPortal: () => void = () => undefined,
  ) {
    this.baseUrl = baseUrl;
    this.onRequestPortal = onRequestPortal;
    this.root = document.createElement("section");
    this.root.className = "jianghu-world-root";
    this.root.setAttribute("aria-label", `${WORLD_NAMING.jianghu.chineseTitle}第三世界`);
    this.style = document.createElement("style");
    this.style.textContent = css;
    document.head.append(this.style);
    this.render(onRequestGuest);
    window.addEventListener("keydown", this.handleKeydown);
    window.addEventListener("keyup", this.handleKeyup);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setPortalState(state: PortalJourneyState): void {
    this.root.dataset.portalState = state;
  }

  focusAgent(agentId: string | null): boolean {
    if (!agentId) {
      this.closeDialogue();
      return true;
    }
    const agent = this.agents.find((candidate) => candidate.id === agentId);
    if (!agent) return false;
    this.openDialogue(agent);
    return true;
  }

  update(elapsed: number, delta: number): void {
    if (this.paused || this.disposed) return;
    if (elapsed >= this.nextSceneAt) {
      this.playScene(elapsed);
      this.nextSceneAt = elapsed + 5.8 + Math.random() * 3.5;
    }
    this.updateVisit(elapsed);
    this.updateGuest(delta, elapsed);
    this.updateSprites(elapsed);
  }

  dispose(): void {
    this.disposed = true;
    window.removeEventListener("keydown", this.handleKeydown);
    window.removeEventListener("keyup", this.handleKeyup);
    this.root.remove();
    this.style.remove();
  }

  private render(onRequestGuest: () => void): void {
    const stageWrap = document.createElement("div");
    stageWrap.className = "jianghu-stage-wrap";
    const stage = document.createElement("div");
    stage.className = "jianghu-stage";
    stage.innerHTML = `
      <img class="jianghu-stage-bg" src="${this.baseUrl}${WORLD_NAMING.jianghu.sceneBackground}" alt="" draggable="false" />
      <div class="jianghu-controls">
        <button type="button" data-jianghu-handoff>观察动线</button>
        <button type="button" data-jianghu-return>前往线稿世界</button>
      </div>
      <div class="jianghu-help">WASD / 方向键移动访客 · 靠近人物时按 E 对话</div>
      <div class="jianghu-vignette" aria-hidden="true"></div>
      <div class="jianghu-dialog" data-jianghu-dialog hidden>
        <button class="jianghu-dialog-close" type="button" data-dialog-close aria-label="离开对话">×</button>
        <div class="jianghu-dialog-portrait left">
          <img data-dialog-guest alt="" draggable="false" />
          <strong>访客</strong>
          <span>PLAYER</span>
        </div>
        <div class="jianghu-subtitle" role="dialog" aria-live="polite" aria-label="人物对话">
          <header>
            <div>
              <strong data-dialog-speaker></strong>
              <small data-dialog-role></small>
            </div>
            <small data-dialog-count></small>
          </header>
          <p data-dialog-line></p>
        </div>
        <div class="jianghu-dialog-portrait right">
          <img data-dialog-agent alt="" draggable="false" />
          <strong data-dialog-agent-name></strong>
          <span data-dialog-agent-role></span>
        </div>
      </div>
    `;
    stageWrap.append(stage);
    const mobileControls = document.createElement("div");
    mobileControls.className = "jianghu-mobile-controls";
    mobileControls.setAttribute("aria-label", "访客移动控制");
    mobileControls.innerHTML = `
      <button type="button" data-jianghu-move="up" aria-label="向上移动">↑</button>
      <button type="button" data-jianghu-move="left" aria-label="向左移动">←</button>
      <button type="button" data-jianghu-move="down" aria-label="向下移动">↓</button>
      <button type="button" data-jianghu-move="right" aria-label="向右移动">→</button>
      <button type="button" data-jianghu-talk aria-label="和最近的人物对话">聊</button>
    `;
    stageWrap.append(mobileControls);
    this.root.append(stageWrap);

    const moveKeys = { up: "w", left: "a", down: "s", right: "d" } as const;
    mobileControls
      .querySelectorAll<HTMLButtonElement>("[data-jianghu-move]")
      .forEach((button) => {
        const direction = button.dataset.jianghuMove as keyof typeof moveKeys;
        const key = moveKeys[direction];
        const release = (): void => {
          this.keys.delete(key);
        };
        button.addEventListener("pointerdown", (event) => {
          button.setPointerCapture(event.pointerId);
          this.keys.add(key);
        });
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
      });
    mobileControls
      .querySelector<HTMLButtonElement>("[data-jianghu-talk]")
      ?.addEventListener("click", () => {
        const nearest = this.findNearestAgent();
        if (nearest) this.openDialogue(nearest);
      });
    this.root
      .querySelector<HTMLButtonElement>("[data-jianghu-return]")
      ?.addEventListener("click", () => this.onRequestPortal());

    for (const agent of this.agents) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `jianghu-agent ${agent.status === "busy" ? "is-busy" : ""} ${agent.id === JIANGHU_PORTAL_AGENT_ID ? "is-world-guide" : ""}`;
      el.dataset.jianghuAgent = agent.id;
      el.style.left = `${(agent.x / SCENE_W) * 100}%`;
      el.style.top = `${(agent.y / SCENE_H) * 100}%`;
      el.style.zIndex = String(Math.round(agent.y));
      el.innerHTML = `
        <div class="jianghu-bubble" hidden></div>
        ${agent.id === JIANGHU_PORTAL_AGENT_ID ? '<div class="jianghu-guide-hint">按 E / 点「聊」· 请我开纸门</div>' : ""}
        <div class="jianghu-shadow"></div>
        <div class="jianghu-sprite"><img alt="" draggable="false" /></div>
        <div class="jianghu-name" style="border-top:2px solid ${agent.color}">${agent.name}</div>
      `;
      const image = el.querySelector<HTMLImageElement>("img");
      const bubble = el.querySelector<HTMLElement>(".jianghu-bubble");
      if (!image || !bubble) throw new Error("Jianghu agent template failed.");
      image.src = this.spriteUrl(agent, "doze");
      el.addEventListener("click", () => this.openDialogue(agent));
      stage.append(el);
      this.agentEls.set(agent.id, el);
      this.spriteEls.set(agent.id, image);
      this.bubbleEls.set(agent.id, bubble);
    }

    const guest = document.createElement("div");
    guest.className = "jianghu-guest";
    guest.hidden = true;
    guest.innerHTML = `
      <div class="jianghu-bubble" hidden>进度如何？</div>
      <img alt="" draggable="false" />
      <div class="jianghu-name" style="border-top:2px solid #7fd6bd">访客</div>
    `;
    stage.append(guest);
    this.agentEls.set("__guest", guest);
    this.spriteEls.set("__guest", guest.querySelector("img")!);
    const guestPortrait = stage.querySelector<HTMLImageElement>("[data-dialog-guest]");
    if (guestPortrait) guestPortrait.src = `${this.baseUrl}${WORLD_NAMING.jianghu.assetBasePath}/agents/guest-girl/idle.webp`;

    this.seatGuest();
    onRequestGuest();
    this.root.querySelector<HTMLButtonElement>("[data-jianghu-handoff]")?.addEventListener("click", () => this.playScene(performance.now() / 1000));
    // 对话用整层点击推进，减少底部按钮对画面的干扰；右上角保留低调关闭入口。
    this.root.querySelector<HTMLElement>("[data-jianghu-dialog]")?.addEventListener("click", () => this.advanceDialogue());
    this.root.querySelector<HTMLButtonElement>("[data-dialog-close]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.closeDialogue();
    });
  }

  private spriteUrl(agent: JianghuAgentSpec, pose: JianghuSpritePose): string {
    if (agent.asset === "guest") {
      const file = pose === "startle" ? "urge" : pose === "cheer" ? "walk-a" : "idle";
      return `${this.baseUrl}${WORLD_NAMING.jianghu.assetBasePath}/agents/${agent.folder}/${file}.webp`;
    }
    return `${this.baseUrl}${WORLD_NAMING.jianghu.assetBasePath}/agents/${agent.folder}/${agent.asset}-${pose}.webp`;
  }

  private speak(id: string, text: string, seconds: number): void {
    const bubble = this.bubbleEls.get(id);
    if (!bubble) return;
    bubble.textContent = text;
    bubble.hidden = false;
    window.setTimeout(() => {
      if (bubble.textContent === text) bubble.hidden = true;
    }, seconds * 1000);
  }

  private roleFor(agent: JianghuAgentSpec): string {
    return agent.role;
  }

  private dialogueLinesFor(agent: JianghuAgentSpec): readonly string[] {
    return agent.dialogue.length > 0 ? agent.dialogue : [agent.bubble];
  }

  private openDialogue(agent: JianghuAgentSpec): void {
    this.dialogue = { agent, lineIndex: 0, lines: this.dialogueLinesFor(agent) };
    this.root.classList.add("is-dialog-open");
    this.renderDialogue();
    this.onFocusChange?.(agent.id);
  }

  private renderDialogue(): void {
    if (!this.dialogue) return;
    const dialog = this.root.querySelector<HTMLElement>("[data-jianghu-dialog]");
    const speaker = this.root.querySelector<HTMLElement>("[data-dialog-speaker]");
    const role = this.root.querySelector<HTMLElement>("[data-dialog-role]");
    const count = this.root.querySelector<HTMLElement>("[data-dialog-count]");
    const line = this.root.querySelector<HTMLElement>("[data-dialog-line]");
    const agentImage = this.root.querySelector<HTMLImageElement>("[data-dialog-agent]");
    const agentName = this.root.querySelector<HTMLElement>("[data-dialog-agent-name]");
    const agentRole = this.root.querySelector<HTMLElement>("[data-dialog-agent-role]");
    const guestPortrait = this.root.querySelector<HTMLElement>(".jianghu-dialog-portrait.left");
    const agentPortrait = this.root.querySelector<HTMLElement>(".jianghu-dialog-portrait.right");
    if (!dialog || !speaker || !role || !count || !line || !agentImage || !agentName || !agentRole || !guestPortrait || !agentPortrait) return;
    const { agent, lineIndex, lines } = this.dialogue;
    const agentSpeaking = lineIndex % 2 === 0;
    dialog.hidden = false;
    speaker.textContent = agentSpeaking ? agent.name : "访客";
    role.textContent = agentSpeaking ? this.roleFor(agent) : "PLAYER";
    count.textContent = `${lineIndex + 1} / ${lines.length}`;
    line.textContent = lines[lineIndex];
    agentImage.src = this.spriteUrl(agent, "cheer");
    agentName.textContent = agent.name;
    agentRole.textContent = this.roleFor(agent).toUpperCase();
    guestPortrait.classList.toggle("is-speaking", !agentSpeaking);
    guestPortrait.classList.toggle("is-muted", agentSpeaking);
    agentPortrait.classList.toggle("is-speaking", agentSpeaking);
    agentPortrait.classList.toggle("is-muted", !agentSpeaking);
  }

  private advanceDialogue(): void {
    if (!this.dialogue) return;
    if (this.dialogue.lineIndex >= this.dialogue.lines.length - 1) {
      const opensPortal = this.dialogue.agent.id === JIANGHU_PORTAL_AGENT_ID;
      this.closeDialogue();
      if (opensPortal) this.onRequestPortal();
      return;
    }
    this.dialogue.lineIndex += 1;
    this.renderDialogue();
  }

  private closeDialogue(): void {
    const hadDialogue = this.dialogue !== null;
    this.dialogue = null;
    this.root.classList.remove("is-dialog-open");
    const dialog = this.root.querySelector<HTMLElement>("[data-jianghu-dialog]");
    if (dialog) dialog.hidden = true;
    this.root.querySelectorAll<HTMLElement>(".jianghu-dialog-portrait").forEach((portrait) => {
      portrait.classList.remove("is-speaking", "is-muted");
    });
    if (hadDialogue) this.onFocusChange?.(null);
  }

  private playScene(elapsed: number): void {
    const [from, to, line] = JIANGHU_SCENES[Math.floor(Math.random() * JIANGHU_SCENES.length)];
    const fromAgent = this.agents.find((agent) => agent.id === from);
    const toAgent = this.agents.find((agent) => agent.id === to);
    if (!fromAgent || !toAgent || this.visit) return;
    const side = fromAgent.x <= toAgent.x ? -1 : 1;
    this.visit = {
      id: from,
      start: elapsed,
      end: elapsed + 8.4,
      fromX: fromAgent.xNow,
      fromY: fromAgent.yNow,
      toX: toAgent.x + side * 48,
      toY: toAgent.y + 10,
      returning: false,
    };
    this.speak(from, line, 4);
    this.speak(to, "收到，交给下一个模块。", 3.6);
  }

  private updateVisit(elapsed: number): void {
    if (!this.visit) return;
    const agent = this.agents.find((item) => item.id === this.visit?.id);
    const el = this.agentEls.get(this.visit.id);
    if (!agent || !el) return;
    const half = (this.visit.end - this.visit.start) / 2;
    if (!this.visit.returning && elapsed > this.visit.start + half) {
      this.visit.returning = true;
      this.moveAgent(agent, el, this.visit.fromX, this.visit.fromY);
      return;
    }
    if (elapsed >= this.visit.end) {
      this.moveAgent(agent, el, agent.x, agent.y);
      this.visit = null;
      return;
    }
    if (!this.visit.returning) this.moveAgent(agent, el, this.visit.toX, this.visit.toY);
  }

  private moveAgent(agent: JianghuAgentSpec & { xNow: number; yNow: number }, el: HTMLElement, x: number, y: number): void {
    agent.xNow = x;
    agent.yNow = y;
    el.style.left = `${(x / SCENE_W) * 100}%`;
    el.style.top = `${(y / SCENE_H) * 100}%`;
    el.style.zIndex = String(Math.round(y));
  }

  private seatGuest(): void {
    const el = this.agentEls.get("__guest");
    if (!el) return;
    this.guest = { seated: true, x: 960, y: 1000, frame: 0, facing: 1 };
    el.hidden = false;
    this.positionGuest();
  }

  private updateGuest(delta: number, elapsed: number): void {
    if (!this.guest.seated) return;
    const input = this.readInputVector();
    const moving = input.x !== 0 || input.y !== 0;
    if (moving) {
      this.guest.facing = input.x < 0 ? -1 : input.x > 0 ? 1 : this.guest.facing;
      this.guest.x = Math.min(1720, Math.max(260, this.guest.x + input.x * 230 * delta));
      this.guest.y = Math.min(960, Math.max(260, this.guest.y + input.y * 230 * delta));
      this.guest.frame = Math.floor(elapsed * 5) % 2;
      this.positionGuest();
    }
    const image = this.spriteEls.get("__guest");
    if (image) {
      image.src = `${this.baseUrl}${WORLD_NAMING.jianghu.assetBasePath}/agents/guest-girl/${moving ? (this.guest.frame ? "walk-b" : "walk-a") : "idle"}.webp`;
    }
    this.updatePortalGuideHint();
  }

  private updatePortalGuideHint(): void {
    const guide = this.agents.find(
      (agent) => agent.id === JIANGHU_PORTAL_AGENT_ID,
    );
    const guideElement = this.agentEls.get(JIANGHU_PORTAL_AGENT_ID);
    if (!guide || !guideElement) return;
    const distance = Math.hypot(
      guide.xNow - this.guest.x,
      guide.yNow - this.guest.y,
    );
    guideElement.classList.toggle("is-near-guest", distance < 190);
  }

  private positionGuest(): void {
    const el = this.agentEls.get("__guest");
    if (!el) return;
    el.style.left = `${(this.guest.x / SCENE_W) * 100}%`;
    el.style.top = `${(this.guest.y / SCENE_H) * 100}%`;
    el.style.zIndex = String(Math.round(this.guest.y));
    const image = this.spriteEls.get("__guest");
    if (image) image.style.transform = `scaleX(${this.guest.facing})`;
  }

  private readInputVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  private updateSprites(elapsed: number): void {
    for (const agent of this.agents) {
      const image = this.spriteEls.get(agent.id);
      if (!image) continue;
      const walking = this.visit?.id === agent.id;
      const pose: JianghuSpritePose = walking ? "cheer" : agent.status === "busy" ? (Math.floor(elapsed * 2.2) % 2 ? "startle" : "cheer") : "doze";
      const next = this.spriteUrl(agent, pose);
      if (!image.src.endsWith(next.replace(this.baseUrl, ""))) image.src = next;
    }
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if ((key === "enter" || key === " ") && this.dialogue) {
      this.advanceDialogue();
      event.preventDefault();
      return;
    }
    if (key === "escape" && this.dialogue) {
      this.closeDialogue();
      event.preventDefault();
      return;
    }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      this.keys.add(key);
      event.preventDefault();
    }
    if (key === "e" && this.guest.seated) {
      const nearest = this.findNearestAgent();
      if (nearest) this.openDialogue(nearest);
    }
  };

  private handleKeyup = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private findNearestAgent(): JianghuAgentSpec | null {
    let best: JianghuAgentSpec | null = null;
    let bestDistance = Infinity;
    for (const agent of this.agents) {
      const distance = Math.hypot(agent.xNow - this.guest.x, agent.yNow - this.guest.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = agent;
      }
    }
    return bestDistance < 180 ? best : null;
  }
}

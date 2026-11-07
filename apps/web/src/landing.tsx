"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Hammer,
  Image as ImageIcon,
  Layers3,
  Menu,
  MessageSquare,
  PaintRoller,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Link } from "./navigation";
import { Badge, Brand, Language } from "./ui";
import { photoCredits } from "./photo-credits";
import "./marketing-i18n";

const anchors = [
  ["how", "how-it-works"],
  ["features", "features"],
  ["workers", "for-workers"],
  ["customers", "for-customers"],
  ["why", "why-kaamproof"],
] as const;
const featureIcons = [
  FileText,
  FileCheck2,
  ImageIcon,
  CheckCheck,
  Wallet,
  ReceiptText,
];
const tradeNames = [
  "electrician",
  "plumber",
  "carpenter",
  "painter",
  "contractor",
  "repair",
];
const stepIcons = [Users, FileText, ImageIcon, ClipboardCheck, CheckCheck];
const viewIcons = [
  Layers3,
  BriefcaseBusiness,
  FileText,
  ImageIcon,
  FileCheck2,
  Wallet,
];
const featureViews = [2, 4, 3, 4, 5, 2];

export function PublicNavigation() {
  const { t } = useTranslation(),
    [open, setOpen] = useState(false),
    toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);
  return (
    <header className="public-header">
      <div className="public-nav">
        <Brand />
        <nav className="public-desktop-nav" aria-label={t("pub.navLabel")}>
          {anchors.map(([key, id]) => (
            <a href={"/#" + id} key={key}>
              {t("pub." + key)}
            </a>
          ))}
        </nav>
        <div className="public-account">
          <span>{t("pub.already")}</span>
          <Link className="button secondary public-signin" to="/login">
            {t("login")}
          </Link>
          <Link className="button public-start" to="/register">
            {t("pub.getStarted")}
            <ArrowUpRight size={16} />
          </Link>
          <div className="public-language">
            <Language />
          </div>
        </div>
        <button
          className="public-menu-toggle icon-button"
          aria-label={t(open ? "pub.closeMenu" : "pub.menu")}
          aria-expanded={open}
          aria-controls="public-mobile-nav"
          onClick={() => setOpen(!open)}
          ref={toggle}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <nav
        id="public-mobile-nav"
        className={"public-mobile-nav" + (open ? " is-open" : "")}
        aria-label={t("pub.navLabel")}
      >
        {anchors.map(([key, id]) => (
          <a href={"/#" + id} key={key} onClick={() => setOpen(false)}>
            {t("pub." + key)}
            <ArrowUpRight size={17} />
          </a>
        ))}
        <div>
          <Language />
          <Link
            className="button"
            to="/register"
            onClick={() => setOpen(false)}
          >
            {t("pub.getStarted")}
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
export function PublicFooter() {
  const { t } = useTranslation();
  return (
    <footer className="public-footer">
      <div className="public-container footer-columns">
        <div className="footer-brand">
          <Brand />
          <p>{t("pub.footerText")}</p>
          <span>{t("tagline")}</span>
        </div>
        <div>
          <h2>{t("pub.product")}</h2>
          <a href="/#features">{t("pub.features")}</a>
          <a href="/#how-it-works">{t("pub.how")}</a>
          <a href="/#for-workers">{t("pub.workers")}</a>
          <a href="/#for-customers">{t("pub.customers")}</a>
        </div>
        <div>
          <h2>{t("pub.account")}</h2>
          <Link to="/login">{t("login")}</Link>
          <Link to="/register">{t("register")}</Link>
          <a href="/#faq">{t("pub.support")}</a>
        </div>
        <div>
          <h2>{t("pub.why")}</h2>
          <a href="/#why-kaamproof">{t("pub.trustTitle")}</a>
          <a href="/#faq">{t("pub.faqTitle")}</a>
          <Link to="/photo-credits">{t("pub.photoCredits")}</Link>
        </div>
      </div>
      <div className="public-container footer-bottom">
        <p>{t("pub.limitations")}</p>
        <span>{t("pub.copyright", { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
function SectionHeading({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="public-section-heading">
      <p className="public-kicker">{t("pub." + kicker)}</p>
      <h2>{t("pub." + title)}</h2>
      {text && <p>{t("pub." + text)}</p>}
    </div>
  );
}
function Photo({
  name,
  alt,
  preload = false,
  className = "",
}: {
  name: string;
  alt: string;
  preload?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Image
      src={"/images/" + name + ".webp"}
      alt={t("pub." + alt)}
      width={name === "plumber" ? 1012 : 1800}
      height={
        name === "plumber"
          ? 1800
          : name === "electrician"
            ? 1350
            : name === "repair"
              ? 1202
              : 1200
      }
      sizes={
        preload
          ? "(max-width: 767px) 100vw, (max-width: 1200px) 50vw, 640px"
          : "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 440px"
      }
      preload={preload}
      loading={preload ? undefined : "lazy"}
      className={className}
    />
  );
}
function HeroRecord() {
  const { t } = useTranslation();
  return (
    <div className="hero-record">
      <div className="hero-record-top">
        <span className="record-logo">
          <ClipboardCheck size={19} />
        </span>
        <strong>{t("pub.sampleJob")}</strong>
        <span className="record-dot" />
      </div>
      <ol>
        {[
          { icon: FileText, label: "agreement" },
          { icon: ImageIcon, label: "evidence" },
          { icon: CheckCheck, label: "completion" },
        ].map(({ icon: Icon, label }, i) => (
          <li key={label}>
            <span className={"record-step step-" + i}>
              <Icon size={16} />
            </span>
            <span>{t(label)}</span>
            <Check size={15} />
          </li>
        ))}
      </ol>
      <small>{t("pub.sample")}</small>
    </div>
  );
}

export function ProductPreview({ view }: { view: number }) {
  const { t } = useTranslation();
  return (
    <div className="public-product-preview" data-preview={view}>
      <div className="preview-chrome">
        <span className="preview-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <ShieldCheck size={13} />
          kaamproof / {t("pub.view" + view)}
        </span>
        <span className="preview-lock">
          <ShieldCheck size={16} />
        </span>
      </div>
      <div className="preview-body">
        <div className="preview-heading">
          <div>
            <span className="preview-eyebrow">{t("pub.sample")}</span>
            <h3>{view === 0 ? t("xp.title") : t("pub.sampleJob")}</h3>
            <p>
              {t("pub.sampleCustomer")} · {t("pub.previewNote")}
            </p>
          </div>
          {view !== 0 && (
            <Badge status={view === 4 ? "approved" : "in_progress"} />
          )}
        </div>
        {view === 0 ? (
          <>
            <div className="preview-kpis">
              <div>
                <BriefcaseBusiness size={18} />
                <span>{t("total")}</span>
                <strong>1</strong>
              </div>
              <div>
                <Wallet size={18} />
                <span>{t("pub.paymentValue")}</span>
                <strong>₹500</strong>
              </div>
              <div>
                <ReceiptText size={18} />
                <span>{t("pub.balanceValue")}</span>
                <strong>₹1,500</strong>
              </div>
            </div>
            <div className="preview-job">
              <span className="preview-job-icon">
                <Hammer size={23} />
              </span>
              <span>
                <strong>{t("pub.sampleJob")}</strong>
                <small>{t("pub.sampleCustomer")}</small>
              </span>
              <Badge status="in_progress" />
            </div>
            <div className="preview-next">
              <span>
                <Sparkles size={20} />
              </span>
              <div>
                <small>{t("pub.yourNextStep")}</small>
                <strong>{t("pub.documentWork")}</strong>
              </div>
              <ArrowUpRight size={19} />
            </div>
          </>
        ) : view === 1 ? (
          <>
            <div className="preview-nav">
              {["activity", "agreement", "evidence", "payments"].map((k) => (
                <span key={k}>{t(k)}</span>
              ))}
            </div>
            <div className="preview-scope">
              <span>{t("scope")}</span>
              <h4>{t("pub.sampleScope")}</h4>
              <p>{t("pub.detailHint")}</p>
            </div>
            <div className="preview-update">
              <Clock3 size={18} />
              <div>
                <strong>{t("pub.exampleUpdate")}</strong>
                <span>
                  {t("worker")} · {t("pub.timestamp")}
                </span>
              </div>
            </div>
          </>
        ) : view === 2 ? (
          <div className="preview-agreement">
            <div>
              <FileText size={24} />
              <strong>{t("pub.latestVersion")}</strong>
              <Badge status="approved" />
            </div>
            <p>
              <span>{t("scope")}</span>
              {t("pub.sampleScope")}
            </p>
            <p>
              <span>{t("exclusions")}</span>
              {t("pub.sampleExclusions")}
            </p>
            <dl>
              <div>
                <dt>{t("labour")}</dt>
                <dd>₹1,500</dd>
              </div>
              <div>
                <dt>{t("materials")}</dt>
                <dd>₹500</dd>
              </div>
              <div>
                <dt>{t("pub.totalValue")}</dt>
                <dd>₹2,000</dd>
              </div>
            </dl>
          </div>
        ) : view === 3 ? (
          <div className="preview-evidence">
            <div className="preview-evidence-photo">
              <Photo name="carpenter" alt="alt2" />
              <span>
                <ImageIcon size={16} />
                {t("evidence")}
              </span>
            </div>
            <div className="preview-evidence-event">
              <span>
                <Check size={17} />
              </span>
              <div>
                <strong>{t("pub.exampleUpdate")}</strong>
                <p>{t("pub.timestamp")}</p>
                <small>{t("pub.evidenceHint")}</small>
              </div>
            </div>
          </div>
        ) : view === 4 ? (
          <div className="preview-customer">
            <span className="customer-preview-seal">
              <FileCheck2 size={34} />
            </span>
            <span className="preview-eyebrow">{t("pub.privateLink")}</span>
            <h4>{t("pub.recordedDecision")}</h4>
            <p>{t("pub.exampleReview")}</p>
            <div>
              <span>{t("pub.latestVersion")}</span>
              <Badge status="approved" />
            </div>
            <small>{t("pub.exampleComplete")}</small>
          </div>
        ) : (
          <div className="preview-payments">
            <div className="preview-money">
              <div>
                <span>{t("pub.totalValue")}</span>
                <strong>₹2,000</strong>
              </div>
              <div>
                <span>{t("pub.paymentValue")}</span>
                <strong>₹500</strong>
              </div>
            </div>
            <div className="preview-balance">
              <span>{t("pub.balanceValue")}</span>
              <strong>₹1,500</strong>
              <div>
                <i />
              </div>
            </div>
            <div className="preview-payment-entry">
              <span>
                <Wallet size={20} />
              </span>
              <div>
                <strong>{t("pub.partial")}</strong>
                <small>UPI · {t("xp.selfReported")}</small>
              </div>
              <strong>+₹500</strong>
            </div>
          </div>
        )}
      </div>
      <div className="preview-foot">
        <span>
          <ShieldCheck size={14} />
          {t("pub.sample")}
        </span>
        <span>{t("tagline")}</span>
      </div>
    </div>
  );
}
export function Landing() {
  const { t } = useTranslation(),
    [view, setView] = useState(0);
  return (
    <div className="public-site">
      <PublicNavigation />
      <main id="main-content" tabIndex={-1}>
        <section
          className="public-hero public-container"
          aria-labelledby="public-hero-title"
        >
          <div className="public-hero-copy">
            <p className="public-kicker">
              <span />
              {t("tagline")}
            </p>
            <h1 id="public-hero-title">
              {t("pub.heroLead")} <em>{t("pub.heroAccent")}</em>
            </h1>
            <p className="public-hero-description">{t("pub.heroText")}</p>
            <div className="public-hero-actions">
              <Link className="button" to="/register">
                {t("pub.start")}
                <ArrowUpRight size={19} />
              </Link>
              <a href="#how-it-works" className="public-how-link">
                {t("pub.seeHow")}
                <span>
                  <ArrowDown size={18} />
                </span>
              </a>
            </div>
            <p className="public-hero-note">
              <Check size={17} />
              {t("pub.heroNote")}
            </p>
          </div>
          <div className="public-hero-visual">
            <div className="hero-photo-frame">
              <Photo name="hero" alt="heroPhoto" preload />
              <span className="hero-photo-tag">
                <span />
                {t("pub.photoTag")}
              </span>
              <span className="photo-corner" aria-hidden="true">
                ✦
              </span>
            </div>
            <HeroRecord />
          </div>
        </section>
        <div className="public-trade-strip">
          <div className="public-container">
            <p>{t("pub.workTogether")}</p>
            <div>
              {[Zap, Wrench, Hammer, PaintRoller, BriefcaseBusiness].map(
                (Icon, i) => (
                  <span key={i}>
                    <Icon size={18} />
                    {t("pub.trade" + i)}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
        <section
          className="public-section public-problem public-container"
          aria-labelledby="problem-title"
        >
          <div className="problem-photo">
            <Photo name="contractor" alt="alt4" />
            <div>
              <span>
                <MessageSquare size={21} />
              </span>
              <p>{t("pub.problemCaption")}</p>
            </div>
          </div>
          <div>
            <p className="public-kicker">{t("pub.problemKicker")}</p>
            <h2 id="problem-title">{t("pub.problemTitle")}</h2>
            <p className="section-description">{t("pub.problemText")}</p>
            <ul className="problem-list">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n}>
                  <span />
                  <p>{t("pub.problem" + n)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section id="features" className="public-section public-features">
          <div className="public-container">
            <SectionHeading
              kicker="solutionKicker"
              title="solutionTitle"
              text="solutionText"
            />
            <div className="public-feature-grid">
              {featureIcons.map((Icon, i) => (
                <a
                  className={"public-feature feature-" + i}
                  href="#product"
                  onClick={() => setView(featureViews[i])}
                  key={i}
                  aria-label={t("pub.exploreFeature", {
                    feature: t("pub.feature" + i),
                  })}
                >
                  <span className="feature-icon">
                    <Icon size={25} />
                  </span>
                  <h3>{t("pub.feature" + i)}</h3>
                  <p>{t("pub.feature" + i + "Text")}</p>
                  <div className="feature-miniature" aria-hidden="true">
                    {i === 0 ? (
                      <>
                        <span>{t("scope")}</span>
                        <i />
                        <i className="short" />
                        <div>
                          <span>{t("pub.latestVersion")}</span>
                          <Check size={15} />
                        </div>
                      </>
                    ) : i === 1 ? (
                      <>
                        <span className="mini-avatar">
                          <Users size={17} />
                        </span>
                        <strong>{t("pub.recordedDecision")}</strong>
                        <CheckCheck size={20} />
                      </>
                    ) : i === 2 ? (
                      <>
                        <ImageIcon size={24} />
                        <span className="mini-timeline">
                          <i />
                          <i />
                          <i />
                        </span>
                        <Clock3 size={20} />
                      </>
                    ) : i === 3 ? (
                      <>
                        <span className="mini-approval">
                          <CheckCheck size={24} />
                        </span>
                        <span>{t("pub.exampleComplete")}</span>
                      </>
                    ) : i === 4 ? (
                      <>
                        <span>{t("pub.balanceValue")}</span>
                        <strong>₹1,500</strong>
                        <span className="mini-progress">
                          <i />
                        </span>
                      </>
                    ) : (
                      <>
                        <FileText size={27} />
                        <span>
                          PDF
                          <br />
                          <small>{t("pub.latestVersion")}</small>
                        </span>
                        <ArrowDown size={20} />
                      </>
                    )}
                  </div>
                  <span className="feature-arrow">
                    <ArrowUpRight size={19} />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
        <section id="how-it-works" className="public-section public-workflow">
          <div className="public-container">
            <SectionHeading kicker="workflowKicker" title="workflowTitle" />
            <ol className="public-workflow-steps">
              {stepIcons.map((Icon, i) => (
                <li key={i}>
                  <span className="workflow-number">0{i + 1}</span>
                  <span className="workflow-icon">
                    <Icon size={25} />
                  </span>
                  <h3>{t("pub.step" + i)}</h3>
                  <p>{t("pub.step" + i + "Text")}</p>
                </li>
              ))}
            </ol>
            <div className="workflow-context">
              <Photo name="carpenter" alt="alt2" />
              <div>
                <ShieldCheck size={23} />
                <p>{t("pub.workflowNote")}</p>
              </div>
            </div>
          </div>
        </section>
        <section id="for-workers" className="public-section public-container">
          <SectionHeading
            kicker="peopleKicker"
            title="peopleTitle"
            text="peopleText"
          />
          <div className="profession-grid">
            {tradeNames.map((name, i) => (
              <article className="profession" key={name}>
                <div>
                  <Photo name={name} alt={"alt" + i} />
                  <span>0{i + 1}</span>
                </div>
                <h3>{t("pub.trade" + i)}</h3>
                <p>{t("pub.trade" + i + "Text")}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="product" className="public-section public-showcase">
          <div className="public-container">
            <SectionHeading
              kicker="productKicker"
              title="productTitle"
              text="productText"
            />
            <div className="showcase-layout">
              <div
                className="product-view-tabs"
                role="tablist"
                aria-label={t("pub.previewTabs")}
                aria-orientation="vertical"
              >
                {viewIcons.map((Icon, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    id={"product-tab-" + i}
                    aria-controls="product-preview-panel"
                    aria-selected={view === i}
                    tabIndex={view === i ? 0 : -1}
                    onClick={() => setView(i)}
                    onKeyDown={(e) => {
                      if (
                        [
                          "ArrowDown",
                          "ArrowRight",
                          "ArrowUp",
                          "ArrowLeft",
                          "Home",
                          "End",
                        ].includes(e.key)
                      ) {
                        e.preventDefault();
                        const next =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 5
                              : (i +
                                  (["ArrowDown", "ArrowRight"].includes(e.key)
                                    ? 1
                                    : 5)) %
                                6;
                        setView(next);
                        (
                          e.currentTarget.parentElement!.children[
                            next
                          ] as HTMLButtonElement
                        ).focus();
                      }
                    }}
                  >
                    <Icon size={21} />
                    <span>{t("pub.view" + i)}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                tabIndex={0}
                id="product-preview-panel"
                aria-labelledby={"product-tab-" + view}
              >
                <ProductPreview view={view} />
                <p className="preview-description">
                  {t(
                    "pub." +
                      [
                        "overviewHint",
                        "detailHint",
                        "agreementHint",
                        "evidenceHint",
                        "approvalHint",
                        "paymentHint",
                      ][view],
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="for-customers"
          className="public-section public-container public-customer-story"
        >
          <div>
            <p className="public-kicker">{t("pub.customers")}</p>
            <h2>{t("pub.customerTitle")}</h2>
            <p className="section-description">{t("pub.customerText")}</p>
            <a
              className="public-text-link"
              href="#product"
              onClick={() => setView(4)}
            >
              {t("pub.customerLink")}
              <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="customer-story-card">
            <span className="shared-record-icon">
              <FileCheck2 size={36} />
            </span>
            <div>
              <span className="public-kicker">{t("pub.privateLink")}</span>
              <h3>{t("pub.sampleJob")}</h3>
              <p>{t("pub.latestVersion")}</p>
              <Badge status="approved" />
            </div>
            <CheckCheck className="customer-story-check" size={30} />
          </div>
        </section>
        <section
          id="why-kaamproof"
          className="public-section public-transparency"
        >
          <div className="public-container trust-layout">
            <div className="record-story">
              <p className="public-kicker">{t("tagline")}</p>
              <ol>
                {[FileText, ImageIcon, Clock3, CheckCheck, Wallet].map(
                  (Icon, i) => (
                    <li key={i}>
                      <span>
                        <Icon size={22} />
                      </span>
                      <strong>{t("pub.trust" + i)}</strong>
                      <Check size={17} />
                    </li>
                  ),
                )}
              </ol>
            </div>
            <div>
              <SectionHeading
                kicker="trustKicker"
                title="trustTitle"
                text="trustText"
              />
              <div className="public-transparency-note">
                <ShieldCheck size={24} />
                <p>{t("pub.limitations")}</p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="faq"
          className="public-section public-container public-faq"
        >
          <SectionHeading kicker="faqKicker" title="faqTitle" text="faqText" />
          <div className="faq-list">
            {Array.from({ length: 8 }, (_, i) => (
              <details key={i}>
                <summary>
                  <span>{t("pub.faq" + i)}</span>
                  <Plus size={20} />
                </summary>
                <p>{t("pub.answer" + i)}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="public-final">
          <div className="final-photo">
            <Photo name="hero" alt="heroPhoto" />
          </div>
          <div className="public-container">
            <span className="final-spark" aria-hidden="true">
              ✦
            </span>
            <h2>{t("pub.finalTitle")}</h2>
            <p>{t("pub.finalText")}</p>
            <div>
              <Link className="button" to="/register">
                {t("pub.freeAccount")}
                <ArrowUpRight size={19} />
              </Link>
              <Link className="final-signin" to="/login">
                {t("pub.member")}
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
export function PhotoCredits() {
  const { t } = useTranslation();
  return (
    <div className="public-site">
      <PublicNavigation />
      <main
        className="public-container public-section credits-page"
        id="main-content"
        tabIndex={-1}
      >
        <p className="public-kicker">{t("pub.photoCredits")}</p>
        <h1>{t("pub.creditsTitle")}</h1>
        <p className="section-description">{t("pub.creditsText")}</p>
        <p>
          <a
            href="https://www.pexels.com/license/"
            target="_blank"
            rel="noreferrer"
          >
            {t("pub.license")}
            <ArrowUpRight size={16} />
          </a>
        </p>
        <ul>
          {photoCredits.map((photo, i) => (
            <li key={photo.file}>
              <Image
                src={"/images/" + photo.file}
                width={240}
                height={160}
                sizes="160px"
                alt={t("pub." + (i === 0 ? "heroPhoto" : "alt" + (i - 1)))}
              />
              <div>
                <h2>{photo.photographer}</h2>
                <a href={photo.source} target="_blank" rel="noreferrer">
                  {t("pub.sourcePhoto")}
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </div>
  );
}

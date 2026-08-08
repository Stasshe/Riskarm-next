"use client";

import { renderMarkdown } from "@/lib/markdown";
import type { Feasibility, Finding, RiskLevel, Severity } from "@/types";

interface FindingReportBlockProps {
  finding: Finding;
  index: number;
}

interface MatrixCell {
  feasibility: Feasibility;
  severity: Severity;
  level: RiskLevel;
}

const riskMatrix: readonly MatrixCell[] = [
  { feasibility: "高", severity: "重大", level: "緊急" },
  { feasibility: "高", severity: "高", level: "緊急" },
  { feasibility: "高", severity: "中", level: "高" },
  { feasibility: "高", severity: "低", level: "中" },
  { feasibility: "高", severity: "その他", level: "その他" },
  { feasibility: "中", severity: "重大", level: "緊急" },
  { feasibility: "中", severity: "高", level: "高" },
  { feasibility: "中", severity: "中", level: "中" },
  { feasibility: "中", severity: "低", level: "低" },
  { feasibility: "中", severity: "その他", level: "その他" },
  { feasibility: "低", severity: "重大", level: "高" },
  { feasibility: "低", severity: "高", level: "中" },
  { feasibility: "低", severity: "中", level: "低" },
  { feasibility: "低", severity: "低", level: "低" },
  { feasibility: "低", severity: "その他", level: "その他" },
  { feasibility: "不可", severity: "重大", level: "中" },
  { feasibility: "不可", severity: "高", level: "低" },
  { feasibility: "不可", severity: "中", level: "低" },
  { feasibility: "不可", severity: "低", level: "低" },
  { feasibility: "不可", severity: "その他", level: "その他" },
];

const feasibilityOptions: readonly Feasibility[] = ["高", "中", "低", "不可"];
const severityOptions: readonly Severity[] = ["重大", "高", "中", "低", "その他"];

function getRiskLevelClass(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case "緊急":
      return "area";
    case "高":
      return "area2";
    case "中":
      return "area3";
    case "低":
      return "area8";
    case "その他":
      return "area4";
  }
}

function getFeasibilityLabel(feasibility: Feasibility): string {
  if (feasibility === "不可") return "無";
  return feasibility;
}

function isDimmed(
  feasibility: Feasibility,
  severity: Severity,
  currentFeasibility: Feasibility,
  currentSeverity: Severity,
): boolean {
  return !(feasibility === currentFeasibility && severity === currentSeverity);
}

function getMatrixLevel(feasibility: Feasibility, severity: Severity): RiskLevel {
  const cell = riskMatrix.find(
    (item) => item.feasibility === feasibility && item.severity === severity,
  );
  if (!cell) {
    throw new Error(`Risk matrix cell is missing: ${feasibility}/${severity}`);
  }
  return cell.level;
}

function renderFindingMarkdown(finding: Finding, markdownSource: string): { __html: string } {
  return { __html: renderMarkdown(markdownSource, finding.images) };
}

function getLocationTitle(finding: Finding): string {
  if (finding.notFound) return "調査箇所";
  return "発生箇所";
}

function getDimmedClass(
  feasibility: Feasibility,
  severity: Severity,
  currentFeasibility: Feasibility,
  currentSeverity: Severity,
): string {
  if (isDimmed(feasibility, severity, currentFeasibility, currentSeverity)) return " dimmed";
  return "";
}

function MarkdownHtml({
  finding,
  id,
  markdownSource,
}: {
  finding: Finding;
  id: string;
  markdownSource: string;
}) {
  return (
    <div
      id={id}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: renderMarkdown is the shared report renderer.
      dangerouslySetInnerHTML={renderFindingMarkdown(finding, markdownSource)}
    />
  );
}

export default function FindingReportBlock({ finding, index }: FindingReportBlockProps) {
  return (
    <div className="report" id={`finding-${finding.id}`}>
      <div className="content">
        <div className="vuln-title-wrapper">
          <b className="vuln-title">
            {index + 1}. {finding.title}
          </b>
          {!finding.notFound && (
            <div className="vulnmatrix">
              <div className="jitsugendo">
                <div className="div">実現度</div>
              </div>
              <div className="jitsugendo-values">
                {feasibilityOptions.map((option) => (
                  <div key={option} className="rectangle-parent">
                    <div className="group-child" />
                    <div className="div1">{getFeasibilityLabel(option)}</div>
                  </div>
                ))}
              </div>
              <div className="higaido-values">
                {severityOptions.map((option) => (
                  <div key={option} className="higaido-value">
                    <div className="higaido-value-child" />
                    <div className="div5">{option}</div>
                  </div>
                ))}
              </div>
              <div className="higaido">
                <div className="div10">被害度</div>
              </div>
              <div className="kikendo">
                <div className="kikendo-title">危険度</div>
                <b className="kikendo-value">{finding.riskLevel}</b>
              </div>
              <div className="internalmatrix">
                {feasibilityOptions.map((fOption) => (
                  <div className="row" key={fOption}>
                    {severityOptions.map((sOption) => {
                      const cellLevel = getMatrixLevel(fOption, sOption);
                      const dimmedClass = getDimmedClass(
                        fOption,
                        sOption,
                        finding.feasibility,
                        finding.severity,
                      );
                      return (
                        <div
                          key={`${fOption}-${sOption}`}
                          className={`vulnmatrixcell${dimmedClass}`}
                        >
                          <div className={getRiskLevelClass(cellLevel)} />
                          <b className="text">{cellLevel}</b>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {!finding.notFound && finding.severityReason && (
          <div className="paragraph">
            <div className="title">被害度理由</div>
            <div className="content1">
              <MarkdownHtml
                finding={finding}
                id="severity-reason"
                markdownSource={finding.severityReason}
              />
            </div>
          </div>
        )}
        {!finding.notFound && finding.feasibilityReason && (
          <div className="paragraph">
            <div className="title">実現度理由</div>
            <div className="content1">
              <MarkdownHtml
                finding={finding}
                id="feasibility-reason"
                markdownSource={finding.feasibilityReason}
              />
            </div>
          </div>
        )}
        {finding.locations.length > 0 && (
          <>
            <div className="hasseikasyo">
              <div className="title">{getLocationTitle(finding)}</div>
            </div>
            <div className="table">
              <div className="row4">
                <div className="cell">
                  <div className="content3">
                    <b className="text20">メソッド</b>
                  </div>
                </div>
                <div className="cell1">
                  <div className="content3">
                    <b className="text20">URL</b>
                  </div>
                </div>
                <div className="cell2">
                  <div className="content3">
                    <b className="text20">パラメータ</b>
                  </div>
                </div>
              </div>
              {finding.locations.map((location) => (
                <div
                  className="row5"
                  key={`${location.method}-${location.url}-${location.parameter}`}
                >
                  <div className="cell3">
                    <div className="content3">
                      <div className="text23">{location.method}</div>
                    </div>
                  </div>
                  <div className="cell4">
                    <div className="content3">
                      <div className="text23">{location.url}</div>
                    </div>
                  </div>
                  <div className="cell5">
                    <div className="content3">
                      <div className="text23">{location.parameter}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="paragraph avoid-break">
          <div className="title">説明</div>
          <div className="content1">
            <MarkdownHtml finding={finding} id="description" markdownSource={finding.description} />
          </div>
        </div>
        {finding.reproductionSteps.length > 0 && (
          <div className="paragraph">
            <div className="title">再現方法・詳細</div>
            <div className="content1">
              <ol className="ol">
                {finding.reproductionSteps.map((step) => (
                  <li className="li" key={step}>
                    <MarkdownHtml finding={finding} id="reproduction-step" markdownSource={step} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
        {!finding.notFound && finding.solutions && (
          <div className="paragraph avoid-break">
            <div className="title">対策方法</div>
            <div className="content1">
              <MarkdownHtml finding={finding} id="solutions" markdownSource={finding.solutions} />
            </div>
          </div>
        )}
        {finding.otherRemarks && (
          <div className="paragraph avoid-break">
            <div className="title">その他指摘事項</div>
            <div className="content1">
              <MarkdownHtml
                finding={finding}
                id="other-remarks"
                markdownSource={finding.otherRemarks}
              />
            </div>
          </div>
        )}
        {finding.references.length > 0 && (
          <div className="paragraph avoid-break">
            <div className="title">参考文献</div>
            <div className="content1">
              <ol className="ol">
                {finding.references.map((reference) => (
                  <li className="li" key={reference}>
                    <MarkdownHtml finding={finding} id="reference" markdownSource={reference} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

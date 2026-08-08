"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import FindingReportBlock from "@/components/FindingReportBlock";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getDomain } from "@/lib/firestore/domains";
import { listFindings } from "@/lib/firestore/findings";
import { getSettings } from "@/lib/firestore/settings";
import type { Domain, Finding, RiskLevel, Setting } from "@/types";

function readParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  return null;
}

function formatJapaneseDate(dateString: string | null): string {
  if (!dateString) return "未設定";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function riskRank(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case "緊急":
      return 0;
    case "高":
      return 1;
    case "中":
      return 2;
    case "低":
      return 3;
    case "その他":
      return 4;
  }
}

function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((left, right) => riskRank(left.riskLevel) - riskRank(right.riskLevel));
}

interface CoverPageProps {
  domain: Domain;
  detectedFindings: readonly Finding[];
  notFoundFindings: readonly Finding[];
  settings: Setting;
}

function CoverPage({ domain, detectedFindings, notFoundFindings, settings }: CoverPageProps) {
  let highestRiskLabel = settings.notFoundPrefix;
  if (detectedFindings.length > 0) {
    const firstFinding = detectedFindings[0];
    if (firstFinding) highestRiskLabel = firstFinding.riskLevel;
  }

  return (
    <div className="hyoshi-hyoshi">
      <div className="content-hyoshi">
        <div className="vuln-title-wrapper-hyoshi">
          <b className="vuln-title-hyoshi">
            <span className="vuln-title-txt-hyoshi">
              <div className="not-url-hyoshi">{domain.name}</div>
              <div className="not-url-hyoshi">診断報告書</div>
            </span>
          </b>
        </div>
        <div className="shindan-kikan-hyoshi">
          <div className="title-hyoshi">診断期間</div>
          <div className="content1-hyoshi">
            {formatJapaneseDate(domain.startDate)} 〜 {formatJapaneseDate(domain.endDate)}
          </div>
        </div>
        <div className="target-name-hyoshi">
          <div className="title-hyoshi">診断対象</div>
        </div>
        <div className="sindantaisho-table-hyoshi">
          <div className="row-hyoshi">
            <div className="cell-hyoshi">
              <div className="content2-hyoshi">
                <b className="text-hyoshi">名称</b>
              </div>
            </div>
            <div className="cell1-hyoshi">
              <div className="content2-hyoshi">
                <b className="text-hyoshi">起点となるURL</b>
              </div>
            </div>
          </div>
          <div className="row1-hyoshi">
            <div className="cell2-hyoshi">
              <div className="content2-hyoshi">
                <div className="text2-hyoshi">{domain.name}</div>
              </div>
            </div>
            <div className="cell3-hyoshi">
              <div className="content2-hyoshi">
                <div className="text2-hyoshi">{domain.url}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="jissi-koumoku-hyoshi">
          <div className="title-hyoshi">検査実施項目</div>
          <div className="content1-hyoshi">
            <ol className="xss-sql-csrf-hyoshi">
              {domain.surveyItems.map((item, index) => (
                <li className="xss-hyoshi" key={`${item}-${index}`}>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="shindan-kikan-hyoshi">
          <div className="title-hyoshi">最も深刻な脆弱性の危険度</div>
          <div className="vulnmatrixcell-hyoshi">
            <b className="text4-hyoshi colorize-risk" data-value={highestRiskLabel}>
              {highestRiskLabel}
            </b>
          </div>
        </div>
        <div className="shinkoku-hyokakijyun-hyoshi">
          <div className="title-hyoshi">評価基準</div>
        </div>
        <div className="hyokakijyun-table-hyoshi">
          <div className="hyokakijyun-table-in-hyoshi">
            <div className="row-hyoshi">
              <div className="cell4-hyoshi">
                <div className="content2-hyoshi">
                  <b className="text-hyoshi">危険度</b>
                </div>
              </div>
              <div className="cell1-hyoshi">
                <div className="content2-hyoshi">
                  <b className="text-hyoshi">概要</b>
                </div>
              </div>
            </div>
            <div className="row3-hyoshi">
              <div className="cell6-hyoshi">
                <div className="content2-hyoshi">
                  <b className="text-hyoshi">緊急</b>
                </div>
              </div>
              <div className="cell7-hyoshi">
                <div className="content2-hyoshi">
                  <div className="text2-hyoshi">
                    緊急性のある脆弱性が存在しているため、早急な修正が必要な状態
                  </div>
                </div>
              </div>
            </div>
            <div className="row3-hyoshi">
              <div className="cell8-hyoshi">
                <div className="content2-hyoshi">
                  <b className="text-hyoshi">高</b>
                </div>
              </div>
              <div className="cell7-hyoshi">
                <div className="content2-hyoshi">
                  <div className="text2-hyoshi">
                    危険度高の脆弱性が存在しているため、早期の修正が必要な状態
                  </div>
                </div>
              </div>
            </div>
            <div className="row3-hyoshi">
              <div className="cell10-hyoshi">
                <div className="content2-hyoshi">
                  <b className="text-hyoshi">中</b>
                </div>
              </div>
              <div className="cell7-hyoshi">
                <div className="content2-hyoshi">
                  <div className="text2-hyoshi">
                    危険度中の脆弱性が存在しているため、修正が必要な状態
                  </div>
                </div>
              </div>
            </div>
            <div className="row3-hyoshi">
              <div className="cell12-hyoshi">
                <div className="content2-hyoshi">
                  <b className="text-hyoshi">低</b>
                </div>
              </div>
              <div className="cell7-hyoshi">
                <div className="content2-hyoshi">
                  <div className="text2-hyoshi">
                    危険度低の脆弱性が存在しているため、将来的な修正が望ましい状態
                  </div>
                </div>
              </div>
            </div>
            <div className="row3-hyoshi">
              <div className="cell14-hyoshi">
                <div className="content2-hyoshi">
                  <b className="text-hyoshi">その他</b>
                </div>
              </div>
              <div className="cell7-hyoshi">
                <div className="content2-hyoshi">
                  <div className="text2-hyoshi">
                    現在脆弱性はないが、修正が望ましい項目が存在する状態
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {detectedFindings.length > 0 && (
          <div className="detected-vulnerabilities-hyoshi avoid-break">
            <div className="shinkoku-hyokakijyun-hyoshi">
              <div className="title-hyoshi">検出された脆弱性一覧</div>
            </div>
            <div className="hyokakijyun-table-hyoshi">
              <div className="hyokakijyun-table-in-hyoshi">
                <div className="row-hyoshi">
                  <div className="cell16-hyoshi">
                    <div className="content2-hyoshi">
                      <b className="text-hyoshi">番号</b>
                    </div>
                  </div>
                  <div className="cell17-hyoshi">
                    <div className="content2-hyoshi">
                      <b className="text-hyoshi">危険度</b>
                    </div>
                  </div>
                  <div className="cell17-hyoshi">
                    <div className="content2-hyoshi">
                      <b className="text-hyoshi">被害度</b>
                    </div>
                  </div>
                  <div className="cell17-hyoshi">
                    <div className="content2-hyoshi">
                      <b className="text-hyoshi">実現度</b>
                    </div>
                  </div>
                  <div className="cell1-hyoshi">
                    <div className="content2-hyoshi">
                      <b className="text-hyoshi">脆弱性内容</b>
                    </div>
                  </div>
                </div>
                {detectedFindings.map((finding, index) => (
                  <div className="row9-hyoshi" key={finding.id}>
                    <div className="cell21-hyoshi">
                      <div className="content2-hyoshi">
                        <b className="text-hyoshi">{index + 1}</b>
                      </div>
                    </div>
                    <div className="cell22-hyoshi colorize-risk" data-value={finding.riskLevel}>
                      <div className="content2-hyoshi">
                        <b className="text-hyoshi">{finding.riskLevel}</b>
                      </div>
                    </div>
                    <div className="cell23-hyoshi">
                      <div className="content2-hyoshi">
                        <b className="text-hyoshi colorize-severity" data-value={finding.severity}>
                          {finding.severity}
                        </b>
                      </div>
                    </div>
                    <div className="cell24-hyoshi">
                      <div className="content2-hyoshi">
                        <b
                          className="text-hyoshi colorize-feasibility"
                          data-value={finding.feasibility}
                        >
                          {finding.feasibility}
                        </b>
                      </div>
                    </div>
                    <div className="cell7-hyoshi">
                      <div className="content2-hyoshi">
                        <a className="text2-hyoshi finding-link" href={`#finding-${finding.id}`}>
                          {finding.title}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {notFoundFindings.length > 0 && (
          <div className="detected-vulnerabilities-hyoshi avoid-break">
            <div className="shinkoku-hyokakijyun-hyoshi">
              <div className="title-hyoshi">検出されなかった脆弱性一覧</div>
            </div>
            <div className="hyokakijyun-table-hyoshi">
              <div className="hyokakijyun-table-in-hyoshi">
                <div className="row-hyoshi">
                  <div className="cell16-hyoshi">
                    <div className="content2-hyoshi">
                      <b className="text-hyoshi">番号</b>
                    </div>
                  </div>
                  <div className="cell1-hyoshi">
                    <div className="content2-hyoshi">
                      <b className="text-hyoshi">内容</b>
                    </div>
                  </div>
                </div>
                {notFoundFindings.map((finding, index) => (
                  <div className="row9-hyoshi" key={finding.id}>
                    <div className="cell21-hyoshi">
                      <div className="content2-hyoshi">
                        <b className="text-hyoshi">{index + 1}</b>
                      </div>
                    </div>
                    <div className="cell7-hyoshi">
                      <div className="content2-hyoshi">
                        <a className="text2-hyoshi finding-link" href={`#finding-${finding.id}`}>
                          {finding.title}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DomainReportPage() {
  const params = useParams();
  const domainId = readParam(params.domainId);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domainId) {
      setError("ドメインIDが指定されていません。");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([getDomain(domainId), listFindings({ domainId }), getSettings()])
      .then(([loadedDomain, loadedFindings, loadedSettings]) => {
        if (!active) return;
        setDomain(loadedDomain);
        setFindings(sortFindings(loadedFindings));
        setSettings(loadedSettings);
      })
      .catch((err) => {
        console.error("failed to load domain report", err);
        if (active) setError("ドメインレポートの取得に失敗しました。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [domainId]);

  const detectedFindings = useMemo(
    () => findings.filter((finding) => !finding.notFound),
    [findings],
  );
  const notFoundFindings = useMemo(
    () => findings.filter((finding) => finding.notFound),
    [findings],
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <main className="p-8">
        <ErrorMessage message={error} />
      </main>
    );
  }

  if (!domain || !settings) {
    return <div className="flex h-screen items-center justify-center">レポートデータが見つかりません。</div>;
  }

  return (
    <>
      <div className="fixed right-6 top-6 z-50 print:hidden">
        <Button type="button" variant="primary" onClick={() => window.print()}>
          印刷
        </Button>
      </div>
      <table>
        <thead>
          <tr>
            <td>
              <img className="header-icon" alt="" src="/images/header.svg" />
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <CoverPage
                domain={domain}
                detectedFindings={detectedFindings}
                notFoundFindings={notFoundFindings}
                settings={settings}
              />
              {detectedFindings.map((finding, index) => (
                <FindingReportBlock key={finding.id} finding={finding} index={index} />
              ))}
              {notFoundFindings.map((finding, index) => (
                <FindingReportBlock key={finding.id} finding={finding} index={index} />
              ))}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

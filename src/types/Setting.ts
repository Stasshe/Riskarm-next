import type { Timestamp } from 'firebase/firestore';

export interface Setting {
  reportTitle: string;
  notFoundPrefix: string;
  updatedAt: Timestamp | null;
}

export const DEFAULT_SETTING: Setting = {
  reportTitle: '脆弱性診断結果_{{domain.name}}',
  notFoundPrefix: '[未検出]',
  updatedAt: null,
};

import { IBaseline } from '../../core/types';

export class Baseline implements IBaseline {
  constructor(
    public id: string,
    public projectId: string,
    public name: string,
    public image: string,
    public metadata: {
      viewport: { width: number; height: number };
      url: string;
      timestamp: Date;
    },
    public version: number,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date,
    public domSnapshot?: string,
    public maskConfig?: {
      ignoreCSSSelectors?: string[];
      ignoreRegions?: Array<{x: number, y: number, width: number, height: number}>;
      freezeAnimations?: boolean;
      waitTime?: number;
      disableAnimations?: boolean;
      blockAds?: boolean;
      scrollToTriggerLazyLoad?: boolean;
      stabilityCheck?: boolean;
    }
  ) {}

  static create(data: {
    id: string;
    projectId: string;
    name: string;
    image: string;
    viewport: { width: number; height: number };
    url: string;
    domSnapshot?: string;
    tags?: string[];
    maskConfig?: {
      ignoreCSSSelectors?: string[];
      ignoreRegions?: Array<{x: number, y: number, width: number, height: number}>;
      freezeAnimations?: boolean;
      waitTime?: number;
      disableAnimations?: boolean;
      blockAds?: boolean;
      scrollToTriggerLazyLoad?: boolean;
      stabilityCheck?: boolean;
    };
  }): Baseline {
    const now = new Date();
    return new Baseline(
      data.id,
      data.projectId,
      data.name,
      data.image,
      {
        viewport: data.viewport,
        url: data.url,
        timestamp: now,
      },
      1,
      true,
      now,
      now,
      data.domSnapshot,
      data.maskConfig
    );
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }
}
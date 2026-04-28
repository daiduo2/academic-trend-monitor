import { useMemo, useState } from 'react';
import { DashboardPanel, DashboardShell } from '../components/dashboard/DashboardShell';
import OpenAlexFullPaperTopicPeakGlobePanel from '../components/openalex/OpenAlexFullPaperTopicPeakGlobePanel';
import OpenAlexFullPaperTopicPeakGlobeViewport from '../components/openalex/OpenAlexFullPaperTopicPeakGlobeViewport';
import { useOpenAlexFullPaperTopicPeakGlobe } from '../hooks/useOpenAlexFullPaperTopicPeakGlobe';

function ViewStatus({ message, title }) {
  return (
    <DashboardPanel>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
    </DashboardPanel>
  );
}

export default function OpenAlexFieldHeat() {
  const { message, status, topicPeakGlobe } = useOpenAlexFullPaperTopicPeakGlobe();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [hoveredTopic, setHoveredTopic] = useState(null);

  const activeTopic = hoveredTopic || selectedTopic || topicPeakGlobe?.topics?.[0] || null;

  const stats = useMemo(() => {
    const topics = topicPeakGlobe?.topics || [];
    const subfields = new Set(topics.map((topic) => topic.subfieldId || topic.subfieldDisplayName).filter(Boolean));

    return {
      subfields: subfields.size,
      topics: topics.length,
    };
  }, [topicPeakGlobe]);

  if (status === 'loading') {
    return <ViewStatus title="领域热力图加载中" message="正在读取本地 OpenAlex 主题山峰地形数据包..." />;
  }

  if (status !== 'ready' || !topicPeakGlobe) {
    return <ViewStatus title="领域热力图暂不可用" message={message || '本地 OpenAlex 山峰地形数据未就绪。'} />;
  }

  return (
    <DashboardShell
      eyebrow="OpenAlex · 主题山峰地形"
      title="领域热力图"
      description="用山峰起伏的 OpenAlex 主题地形观察不同子领域在全量数学论文空间中的热度分布。"
      metrics={[
        { label: '子领域', value: stats.subfields.toLocaleString(), tone: 'sky' },
        { label: '主题山峰', value: stats.topics.toLocaleString(), tone: 'amber' },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-[720px]">
          <OpenAlexFullPaperTopicPeakGlobeViewport
            activeTopicId={activeTopic?.topicId || null}
            onHoverTopic={setHoveredTopic}
            onSelectTopic={(topicId) => setSelectedTopic(topicPeakGlobe.topicById?.[topicId] || null)}
            topicPeakGlobe={topicPeakGlobe}
          />
        </div>
        <OpenAlexFullPaperTopicPeakGlobePanel topic={activeTopic} />
      </div>
    </DashboardShell>
  );
}

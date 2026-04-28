import { useMemo, useState } from 'react';
import { DashboardPanel, DashboardShell } from '../components/dashboard/DashboardShell';
import OpenAlexFullPaperLightPaperCloudPanel from '../components/openalex/OpenAlexFullPaperLightPaperCloudPanel';
import OpenAlexFullPaperLightPaperCloudViewport from '../components/openalex/OpenAlexFullPaperLightPaperCloudViewport';
import { useOpenAlexFullPaperLightPaperCloud } from '../hooks/useOpenAlexFullPaperLightPaperCloud';

function ViewStatus({ message, title }) {
  return (
    <DashboardPanel>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
    </DashboardPanel>
  );
}

export default function OpenAlexPaperCloud() {
  const { lightPaperCloud, message, status } = useOpenAlexFullPaperLightPaperCloud();
  const [hideUnselectedTopics, setHideUnselectedTopics] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [hoveredTopic, setHoveredTopic] = useState(null);

  const selectedTopics = useMemo(() => {
    const topicById = lightPaperCloud?.topicById || {};
    return selectedTopicIds
      .map((topicId) => topicById[topicId] || lightPaperCloud?.topics?.find((topic) => topic?.topicId === topicId) || null)
      .filter(Boolean);
  }, [lightPaperCloud, selectedTopicIds]);
  const activeTopic = hoveredTopic || selectedTopics[0] || lightPaperCloud?.topics?.[0] || null;
  const stats = useMemo(() => ({
    sampledPapers: lightPaperCloud?.sampledPoints?.length || 0,
    topics: lightPaperCloud?.topics?.length || 0,
  }), [lightPaperCloud]);
  const toggleTopic = (topicId) => {
    const normalizedTopicId = String(topicId || '').trim();

    if (!normalizedTopicId) {
      return;
    }

    setSelectedTopicIds((currentTopicIds) => (
      currentTopicIds.includes(normalizedTopicId)
        ? currentTopicIds.filter((currentTopicId) => currentTopicId !== normalizedTopicId)
        : [...currentTopicIds, normalizedTopicId]
    ));
  };

  if (status === 'loading') {
    return <ViewStatus title="文献点云图加载中" message="正在读取本地 OpenAlex 文献点云数据包..." />;
  }

  if (status !== 'ready' || !lightPaperCloud) {
    return <ViewStatus title="文献点云图暂不可用" message={message || '本地 OpenAlex 文献点云数据未就绪。'} />;
  }

  return (
    <DashboardShell
      eyebrow="OpenAlex · 文献点云"
      title="文献点云图"
      description="用更高区分度的主题颜色和主题标签读懂全量数学论文空间，再通过抽样论文点查看局部细节。"
      metrics={[
        { label: '抽样论文', value: stats.sampledPapers.toLocaleString(), tone: 'sky' },
        { label: '主题数', value: stats.topics.toLocaleString(), tone: 'violet' },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div data-testid="paper-cloud-viewport-shell" className="min-h-[720px]">
          <OpenAlexFullPaperLightPaperCloudViewport
            bundle={lightPaperCloud}
            hideUnselectedTopics={hideUnselectedTopics}
            onHoverTopic={setHoveredTopic}
            onSelectTopic={(topic) => toggleTopic(topic?.topicId)}
            selectedTopicId={selectedTopicIds[0] || null}
            selectedTopicIds={selectedTopicIds}
          />
        </div>
        <OpenAlexFullPaperLightPaperCloudPanel
          hideUnselectedTopics={hideUnselectedTopics}
          onClearTopics={() => setSelectedTopicIds([])}
          onToggleHideUnselected={setHideUnselectedTopics}
          onToggleTopic={toggleTopic}
          selectedTopicIds={selectedTopicIds}
          topic={activeTopic}
          topics={lightPaperCloud?.topics || []}
        />
      </div>
    </DashboardShell>
  );
}

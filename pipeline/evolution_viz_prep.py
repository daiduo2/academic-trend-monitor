#!/usr/bin/env python3
"""
演化图可视化数据预处理脚本

将 evolution_graph.json 转换为前端友好的格式
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class VisualizationNode:
    id: str
    topic_id: str
    name: str
    period: str
    category: str
    mode: str
    paper_count: int
    x: float = 0
    y: float = 0


@dataclass
class VisualizationEdge:
    source: str
    target: str
    type: str  # 'continued' | 'diffused'
    confidence: float


def load_evolution_graph(path: str) -> Dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def process_nodes(nodes: List[Dict]) -> List[VisualizationNode]:
    """处理节点数据，添加显示属性"""
    result = []
    for node in nodes:
        result.append(VisualizationNode(
            id=node['id'],
            topic_id=node['topic_id'],
            name=node['name'],
            period=node['period'],
            category=node['category'],
            mode=node['mode'],
            paper_count=node.get('paper_count', 0)
        ))
    return result


def process_edges(edges: List[Dict]) -> List[VisualizationEdge]:
    """处理边数据"""
    result = []
    for edge in edges:
        result.append(VisualizationEdge(
            source=edge['source'],
            target=edge['target'],
            type=edge.get('relation_type', 'continued'),
            confidence=edge.get('confidence', 0.5)
        ))
    return result


def calculate_layout(nodes: List[VisualizationNode], edges: List[VisualizationEdge]) -> None:
    """计算节点布局位置（时间轴布局）"""
    periods = sorted(set(n.period for n in nodes))
    nodes_by_period: Dict[str, List[VisualizationNode]] = {}

    for period in periods:
        nodes_by_period[period] = [n for n in nodes if n.period == period]

    # 为每个时间段的节点分配垂直位置
    for period_idx, (period, period_nodes) in enumerate(nodes_by_period.items()):
        period_nodes.sort(key=lambda n: n.category)
        for i, node in enumerate(period_nodes):
            node.x = period_idx * 200 + 100  # 水平间距
            node.y = (i + 1) * 70 + 50       # 垂直间距


def build_category_tree(nodes: List[VisualizationNode]) -> Dict[str, Any]:
    """构建分类树结构"""
    tree = {}
    for node in nodes:
        cat = node.category
        if cat not in tree:
            tree[cat] = {'count': 0, 'modes': set(), 'subcategories': {}}
        tree[cat]['count'] += 1
        tree[cat]['modes'].add(node.mode)
    return tree


def create_manifest():
    """创建可视化配置文件"""
    manifest = {
        "version": "1.0",
        "domains": [
            {
                "id": "math",
                "name": "Mathematics",
                "available": True,
                "data_file": "math_visualization.json"
            },
            {
                "id": "cs",
                "name": "Computer Science",
                "available": False,
                "data_file": None
            },
            {
                "id": "physics",
                "name": "Physics",
                "available": False,
                "data_file": None
            }
        ],
        "default_domain": "math"
    }

    manifest_path = Path('data/output/evolution_graphs/manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f'Manifest written to {manifest_path}')


def main():
    input_path = Path('data/output/evolution_graphs/math_graph.json')
    output_path = Path('data/output/evolution_graphs/math_visualization.json')

    if not input_path.exists():
        print(f'Error: Input file not found: {input_path}')
        return 1

    print(f'Loading evolution graph from {input_path}...')
    data = load_evolution_graph(str(input_path))

    print(f'Processing {len(data["nodes"])} nodes and {len(data["edges"])} edges...')
    nodes = process_nodes(data['nodes'])
    edges = process_edges(data['edges'])

    print('Calculating layout...')
    calculate_layout(nodes, edges)

    print('Building category tree...')
    category_tree = build_category_tree(nodes)

    output = {
        'version': '1.0',
        'generated_at': data.get('generated_at', datetime.now().isoformat()),
        'domain': data.get('domain', 'math'),
        'metadata': {
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'periods': sorted(set(n.period for n in nodes)),
            'categories': list(category_tree.keys())
        },
        'nodes': [
            {
                'id': n.id,
                'topic_id': n.topic_id,
                'name': n.name,
                'period': n.period,
                'category': n.category,
                'mode': n.mode,
                'paper_count': n.paper_count,
                'x': n.x,
                'y': n.y
            }
            for n in nodes
        ],
        'edges': [
            {
                'source': e.source,
                'target': e.target,
                'type': e.type,
                'confidence': e.confidence
            }
            for e in edges
        ],
        'category_tree': {
            k: {'count': v['count'], 'modes': list(v['modes'])}
            for k, v in category_tree.items()
        }
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'Output written to {output_path}')

    # Create manifest
    create_manifest()

    return 0


if __name__ == '__main__':
    exit(main())

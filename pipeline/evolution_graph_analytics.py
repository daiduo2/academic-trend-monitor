import networkx as nx
from typing import List
from pipeline.evolution_models import (
    TopicNode, EvolutionEdge, GraphAnomaly, AnomalyType, Severity
)


def detect_isolated_clusters(
    nodes: List[TopicNode],
    edges: List[EvolutionEdge],
    min_cluster_size: int = 3
) -> List[GraphAnomaly]:
    """Detect isolated clusters in the graph."""
    # Build NetworkX graph
    G = nx.Graph()
    for node in nodes:
        G.add_node(node.id, category=node.category)
    for edge in edges:
        G.add_edge(edge.source, edge.target)

    anomalies = []
    connected_components = list(nx.connected_components(G))

    # Find the largest component
    if not connected_components:
        return anomalies

    largest_component = max(connected_components, key=len)

    # Report smaller components as anomalies
    for i, component in enumerate(connected_components):
        if component != largest_component and len(component) >= min_cluster_size:
            node_id = list(component)[0]
            category = G.nodes[node_id].get("category", "unknown")

            anomaly = GraphAnomaly(
                anomaly_id=f"ANM-ISOLATED-{i:03d}",
                type=AnomalyType.isolated_cluster,
                location={
                    "nodes": list(component),
                    "category": category
                },
                severity=Severity.medium if len(component) < 5 else Severity.high,
                context={}
            )
            anomalies.append(anomaly)

    return anomalies

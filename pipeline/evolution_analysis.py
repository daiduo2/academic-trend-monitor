import argparse
import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple


DEFAULT_INPUT = Path("data/output/aligned_topics_hierarchy.json")
FALLBACK_INPUT = Path("data/output/aligned_topics.json")
DEFAULT_OUTPUT_DIR = Path("data/output")
TOPICS_TREE_INPUT = Path("data/output/topics_tree.json")

METHOD_HINTS = {
    "algorithm", "algorithms", "model", "models", "framework", "frameworks", "method", "methods",
    "network", "networks", "transformer", "diffusion", "rendering", "reconstruction", "optimization",
    "optimizer", "inference", "estimation", "benchmark", "solver", "solvers", "architecture",
    "architectures", "pipeline", "pipelines",
}
PROBLEM_HINTS = {
    "detection", "segmentation", "classification", "prediction", "forecasting", "reasoning", "alignment",
    "control", "sensing", "imaging", "tomography", "planning", "retrieval", "diagnosis", "generation",
    "understanding", "recognition", "translation", "verification", "localization", "tracking",
}
THEORY_HINTS = {
    "theory", "conjecture", "algebra", "geometry", "homology", "topology", "representation",
    "cohomology", "operator", "modular", "quantum", "galois", "langlands", "symmetry",
}

IMAGING_SOURCE_HINTS = {
    "imaging", "image", "ct", "mri", "tomography", "reconstruction", "radiomic", "radiology",
    "ultrasound", "microscopy", "scan", "scans",
}
ANALYSIS_TARGET_HINTS = {
    "segmentation", "diagnosis", "classification", "detection", "analysis", "recognition",
    "localization", "tracking", "assessment",
}
REPRESENTATION_SOURCE_HINTS = {
    "gaussian", "gaussians", "splatting", "3dgs", "neural", "field", "fields", "voxel", "voxels",
    "mesh", "meshes", "point", "points", "pointcloud", "scene", "scenes", "rendering",
}
PERCEPTION_TARGET_HINTS = {
    "depth", "estimation", "stereo", "visual", "vision", "mapping", "reconstruction",
    "tracking", "slam", "pose", "camera", "perception",
}
FORMAL_STRUCTURE_HINTS = {
    "moduli", "modular", "variety", "varieties", "curve", "curves", "surface", "surfaces",
    "cohomology", "homology", "algebraic", "geometry", "geometric", "representation",
    "representations", "projective", "bundle", "bundles", "gauge", "amplitudes", "brane",
    "cft", "supergravity", "duality", "lie", "superalgebras", "sigma", "theory", "theories",
}
MATH_AG_OBJECT_HINTS = {
    "variety", "varieties", "curve", "curves", "surface", "surfaces", "moduli", "stack",
    "stacks", "scheme", "schemes", "bundle", "bundles", "sheaf", "sheaves", "torsor",
    "torsors", "polytope", "polytopes", "abelian", "shimura", "k3",
}
MATH_AG_METHOD_HINTS = {
    "cohomology", "motivic", "derived", "categorical", "category", "categories", "functor",
    "tropical", "tropicalization", "étale", "adic", "homotopy", "intersection", "constructible",
    "prismatic", "quot", "integrable", "ansatz",
}

MATH_AG_OBJECT_TAXONOMY = {
    "variety_family": {
        "variety", "varieties", "fano", "calabi-yau", "shimura", "abelian", "k3", "threefolds",
        "surface", "surfaces", "curve", "curves", "polytope", "polytopes", "flag", "grassmannian",
        "toric", "divisor", "divisors",
    },
    "moduli_and_stack": {
        "moduli", "stack", "stacks", "torsor", "torsors", "space", "spaces",
    },
    "sheaf_and_bundle": {
        "sheaf", "sheaves", "bundle", "bundles", "coherent", "perverse",
    },
    "scheme_level": {
        "scheme", "schemes", "projective", "algebraic", "birational", "smooth",
    },
}

MATH_AG_METHOD_TAXONOMY = {
    "cohomological": {
        "cohomology", "motivic", "étale", "adic", "homotopy", "prismatic", "springer",
    },
    "derived_categorical": {
        "derived", "categorical", "category", "categories", "functor", "derived_category",
    },
    "geometric_combinatorial": {
        "tropical", "tropicalization", "intersection", "constructible", "quot",
    },
    "integrable_formal": {
        "integrable", "ansatz", "lusztig",
    },
}

MATH_AG_OBJECT_CLASS_WEIGHTS = {
    ("variety_family", "scheme_level"): 0.45,
    ("variety_family", "moduli_and_stack"): 0.4,
    ("moduli_and_stack", "sheaf_and_bundle"): 0.4,
    ("scheme_level", "sheaf_and_bundle"): 0.35,
}

MATH_AG_METHOD_CLASS_WEIGHTS = {
    ("cohomological", "derived_categorical"): 0.45,
    ("cohomological", "geometric_combinatorial"): 0.25,
    ("derived_categorical", "geometric_combinatorial"): 0.3,
    ("derived_categorical", "integrable_formal"): 0.2,
}

MATH_LO_FORMAL_OBJECT_HINTS = {
    "logic", "logics", "modal", "semantics", "satisfiability", "proof", "proofs", "theory",
    "theories", "model", "models", "type", "types", "categorical", "category", "categories",
    "automata", "calculus", "axiom", "axioms", "ultrafilter", "ultrafilters", "forcing",
    "cardinal", "cardinals", "set", "sets", "completeness", "consistency",
}

MATH_LO_FORMAL_METHOD_HINTS = {
    "sequent", "smt", "hoare", "potentialist", "coalgebras", "intuitionistic", "probabilistic",
    "definable", "existential", "nip", "valued", "residue", "revision", "computable", "randomness",
}
MATH_LO_CORE_OBJECT_HINTS = {
    "modal", "automata", "type", "types", "model", "models", "satisfiability", "semantics",
    "proof", "proofs", "forcing", "ultrafilter", "cardinal", "cardinals", "logic", "logics",
}
MATH_LO_MODAL_OBJECT_HINTS = {
    "modal", "logic", "logics", "semantics", "satisfiability", "proof", "proofs",
    "connectives", "calculus",
}
MATH_LO_MODAL_METHOD_HINTS = {
    "intuitionistic", "probabilistic", "sequent", "hoare", "smt",
}
MATH_LO_SET_OBJECT_HINTS = {
    "cardinal", "cardinals", "forcing", "ultrafilter", "ultrafilters", "axiom", "axioms",
    "choice", "zf", "zfc", "ideal", "ideals", "borel", "reals", "set", "sets",
}
MATH_LO_SET_METHOD_HINTS = {
    "definable", "iterable", "potentialist", "constructive", "realizability", "countable",
}
MATH_LO_FORCING_OBJECT_HINTS = {
    "forcing", "cardinal", "cardinals", "zf", "zfc", "axiom", "aleph_1", "reals",
}
MATH_LO_FORCING_METHOD_HINTS = {
    "definable", "iterable", "realizability", "countable",
}
MATH_LO_TYPE_OBJECT_HINTS = {
    "type", "types", "typed",
}
MATH_LO_TYPE_SOURCE_HINTS = {
    "proof", "proofs", "typed", "calculus", "intuitionistic", "propositional",
}
MATH_LO_TYPE_TARGET_HINTS = {
    "type", "types", "program", "programs", "languages", "subtyping", "correctness",
}
MATH_LO_DEFINABILITY_OBJECT_HINTS = {
    "cardinal", "cardinals", "axiom", "reals", "uniformization", "woodin",
}
MATH_LO_DEFINABILITY_METHOD_HINTS = {
    "definable",
}
MATH_LO_DEFINABILITY_SPECIAL_OBJECTS = {
    "woodin", "axiom", "reals", "uniformization",
}

# math.GR (Group Theory) hints
MATH_GR_OBJECT_HINTS = {
    "group", "groups", "subgroup", "normal", "simple", "finite", "infinite", "abelian", "nilpotent",
    "solvable", "representation", "character", "conjugacy", "sylow", "p-group", "free_group",
}
MATH_GR_METHOD_HINTS = {
    "homomorphism", "isomorphism", "action", "orbit", "stabilizer", "sylow_theorem", "cohomology",
    "extension", "composition_series", "character_table",
}

# math.RT (Representation Theory) hints
MATH_RT_OBJECT_HINTS = {
    "representation", "representations", "module", "modules", "character", "irreducible", "reducible",
    "weight", "highest_weight", "root", "roots", "weyl_group", "flag_variety", "schubert",
    "cohomology", "sheaves", "lusztig", "hecke", "categories", "category", "algebra", "algebras",
}
MATH_RT_METHOD_HINTS = {
    "induction", "restriction", "tensor_product", "symmetric_power", "exterior_power", "schur_functor",
    "verma_module", "category_o", "bgg_category", "perverse", "deligne",
}

# math.RA (Rings and Algebras) hints
MATH_RA_OBJECT_HINTS = {
    "ring", "rings", "ideal", "ideals", "module", "algebra", "algebras", "commutative", "noetherian",
    "artinian", "prime_ideal", "maximal_ideal", "radical", "spectrum", "polynomials", "polynomial",
    "matrices", "matrix", "lie",
}
MATH_RA_METHOD_HINTS = {
    "localization", "completion", "tensor_product", "extension", "galois_theory", "homology",
    "projective_resolution", "global_dimension", "regular_local_ring", "rota", "baxter",
}

# math.QA (Quantum Algebra) hints
MATH_QA_OBJECT_HINTS = {
    "quantum", "q-deformation", "hopf_algebra", "quantum_group", "yangian", "crystal_basis",
    "canonical_basis", "braid_group", "temperley-lieb", "hopf", "algebras", "algebra",
    "schubert", "cohomology", "flag", "modules", "module", "categories", "category",
}
MATH_QA_METHOD_HINTS = {
    "r_matrix", "drinfeld_double", "jimbo_quantization", "kashiwara_crystal", "lurzig_basis",
    "categorification", "cluster_algebra", "mutation", "equivariant",
}

# math.AP (Partial Differential Equations) hints
MATH_AP_OBJECT_HINTS = {
    "pde", "equation", "equations", "elliptic", "parabolic", "hyperbolic", "laplacian",
    "schrodinger_equation", "navier_stokes", "wave_equation", "heat_equation",
    "reaction_diffusion", "boundary_value",
}
MATH_AP_METHOD_HINTS = {
    "sobolev_space", "weak_solution", "viscosity_solution", "maximum_principle",
    "energy_estimate", "fixed_point_method", "iteration_scheme", "a_priori_estimate",
    "bootstrap_argument",
}

# math.CA (Classical Analysis and ODEs) hints
MATH_CA_OBJECT_HINTS = {
    "function", "functions", "analytic_function", "harmonic_function", "fourier_series",
    "fourier_transform", "integral", "measure", "ergodic_theory", "complex_dynamics",
    "ordinary_differential_equation", "special_function",
}
MATH_CA_METHOD_HINTS = {
    "complex_analysis", "real_analysis", "potential_theory", "approximation_theory",
    "interpolation", "asymptotic_analysis", "contour_integration", "residue_calculus",
    "steepest_descent",
}

# math.FA (Functional Analysis) hints
MATH_FA_OBJECT_HINTS = {
    "banach_space", "hilbert_space", "operator", "operators", "bounded_linear_operator",
    "compact_operator", "spectral_theory", "semigroup", "distribution", "generalized_function",
    "sobolev_space", "hardy_space",
}
MATH_FA_METHOD_HINTS = {
    "functional_calculus", "spectral_radius", "resolvent", "fredholm_theory", "duality",
    "weak_convergence", "strong_convergence", "unitary_equivalence", "von_neumann_algebra",
    "c_star_algebra",
}

# math.DS (Dynamical Systems) hints
MATH_DS_OBJECT_HINTS = {
    "dynamical_system", "flow", "map", "diffeomorphism", "attractor", "strange_attractor",
    "bifurcation", "chaos", "invariant_set", "topological_entropy", "metric_entropy",
    "periodic_orbit", "homoclinic_orbit",
}
MATH_DS_METHOD_HINTS = {
    "stable_manifold", "unstable_manifold", "center_manifold", "hyperbolicity",
    "structural_stability", "topological_conjugacy", "symbolic_dynamics", "kneading_theory",
    "renormalization", "linearization",
}
# math.DG (Differential Geometry) hints
MATH_DG_OBJECT_HINTS = {
    "manifold", "manifolds", "riemannian_metric", "metric_tensor", "curvature", "sectional_curvature",
    "ricci_curvature", "scalar_curvature", "geodesic", "connection", "levi_civita", "vector_bundle",
    "principal_bundle", "tangent_bundle", "cotangent_bundle", "tensor_field", "differential_form",
    "symplectic_form", "kahler_form",
}
MATH_DG_METHOD_HINTS = {
    "christoffel_symbols", "parallel_transport", "holonomy", "covariant_derivative", "exponential_map",
    "geodesic_flow", "ricci_flow", "mean_curvature_flow", "yang_mills", "chern_connection", "hodge_theory",
}

# math.MG (Metric Geometry) hints
MATH_MG_OBJECT_HINTS = {
    "metric_space", "geodesic_metric_space", "alexandrov_space", "hadamard_space", "cat_k_space",
    "boundary_at_infinity", "gromov_boundary", "gromov_hyperbolic_space", "quasi_geodesic",
    "asymptotic_cone", "tangent_cone",
}
MATH_MG_METHOD_HINTS = {
    "comparison_geometry", "triangle_comparison", "toponogov_comparison", "hausdorff_distance",
    "gromov_hausdorff_convergence", "pointed_gromov_hausdorff", "ultralimit", "filling_radius",
    "systolic_geometry",
}

# math.CV (Complex Variables / Several Complex Variables) hints
MATH_CV_OBJECT_HINTS = {
    "complex_manifold", "complex_structure", "holomorphic_function", "analytic_function",
    "pseudoconvex_domain", "stein_manifold", "kahler_manifold", "domain_of_holomorphy",
    "meromorphic_function", "divisor", "line_bundle", "coherent_sheaf", "plurisubharmonic_function",
}
MATH_CV_METHOD_HINTS = {
    "cauchy_integral", "dbar_operator", "sheaf_cohomology", "l2_estimates", "hormander_theorem",
    "oka_principle", "cartan_theorem_a", "cartan_theorem_b", "lelong_number", "positive_current",
    "bergman_kernel",
}

MATH_DG_OBJECT_TAXONOMY = {
    "riemannian_structure": {
        "metric", "riemannian", "curvature", "ricci", "scalar_curvature", "geodesic",
    },
    "bundle_theory": {
        "vector_bundle", "principal_bundle", "connection", "gauge_field",
    },
    "submanifold_geometry": {
        "submanifold", "hypersurface", "minimal_surface", "geodesic",
    },
    "complex_geometry": {
        "kahler", "symplectic", "complex_manifold", "holomorphic",
    },
}


# math.AT (Algebraic Topology) hints
MATH_AT_OBJECT_HINTS = {
    "homotopy", "homotopy_group", "higher_homotopy", "homology", "cohomology", "spectrum",
    "spectra", "cw_complex", "simplicial_complex", "chain_complex", "fundamental_group",
    "covering_space", "fibration", "cofibration",
}
MATH_AT_METHOD_HINTS = {
    "spectral_sequence", "steenrod_operation", "characteristic_class", "obstruction_theory",
    "stable_homotopy", "unstable_homotopy", "adams_spectral_sequence", "postnikov_tower",
}

# math.GT (Geometric Topology) hints
MATH_GT_OBJECT_HINTS = {
    "manifold", "manifolds", "knot", "knots", "link", "links", "surface", "3_manifold",
    "4_manifold", "handlebody", "heegaard_splitting", "mapping_class_group", "braid_group",
}
MATH_GT_METHOD_HINTS = {
    "surgery_theory", "cobordism", "dehn_surgery", "kirby_calculus", "triangulation",
    "foliation", "hyperbolic_structure", "jsj_decomposition",
}

# math.GN (General Topology) hints
MATH_GN_OBJECT_HINTS = {
    "topological_space", "compact", "hausdorff", "metric_space", "uniform_space", "convergence",
    "filter", "net", "neighborhood", "closure", "interior", "boundary",
}
MATH_GN_METHOD_HINTS = {
    "separation_axiom", "connectedness", "path_connected", "compactification", "completion",
    "metrization_theorem", "paracompactness", "tychonoff", "urysohn",
}

NAME_ALIASES = {
    "three dimensional": "3d",
    "three-dimensional": "3d",
    "三维": "3d",
    "二维": "2d",
    "two dimensional": "2d",
    "two-dimensional": "2d",
}


@dataclass(frozen=True)
class TopicRecord:
    topic_id: str
    name: str
    keywords: Tuple[str, ...]
    keyword_set: Set[str]
    category: str
    subcategory: str
    history: Tuple[Dict[str, int], ...]
    history_map: Dict[str, int]
    total_papers: int
    active_periods: int
    hierarchy_path: Tuple[str, ...]
    hierarchy_depth: int
    representative_evidence: Tuple[str, ...]

    @property
    def first_period(self) -> Optional[str]:
        return self.history[0]["period"] if self.history else None

    @property
    def last_period(self) -> Optional[str]:
        return self.history[-1]["period"] if self.history else None


@dataclass(frozen=True)
class TopicProfile:
    primary_mode: str
    secondary_mode: Optional[str]
    method_score: int
    problem_score: int
    theory_score: int


def _normalize_keywords(keywords: Iterable[str]) -> Tuple[str, ...]:
    seen = set()
    normalized = []
    for keyword in keywords:
        text = str(keyword).strip().lower()
        if not text or text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return tuple(normalized)


def _history_map(history: Sequence[Dict[str, int]]) -> Dict[str, int]:
    return {entry["period"]: int(entry["paper_count"]) for entry in history if "period" in entry}


def _top_level_category(category: str) -> str:
    if not category:
        return ""
    return category.split(".")[0]


def infer_topic_profile(topic: TopicRecord) -> TopicProfile:
    terms = set(topic.keywords)
    terms.update(part.lower() for part in topic.name.replace("/", " ").replace("-", " ").split())
    method_score = sum(1 for term in terms if term in METHOD_HINTS)
    problem_score = sum(1 for term in terms if term in PROBLEM_HINTS)
    theory_score = sum(1 for term in terms if term in THEORY_HINTS)

    if theory_score >= max(method_score, problem_score) and theory_score > 0:
        secondary_mode = "problem" if problem_score > 0 else ("method" if method_score > 0 else None)
        return TopicProfile("theory", secondary_mode, method_score, problem_score, theory_score)

    ranked = sorted(
        [("method", method_score), ("problem", problem_score)],
        key=lambda item: (-item[1], item[0]),
    )
    primary_mode, primary_score = ranked[0]
    secondary_mode = ranked[1][0] if ranked[1][1] > 0 else None

    if primary_score == 0:
        primary_mode = "hybrid"
        secondary_mode = None
    elif ranked[0][1] == ranked[1][1] and ranked[0][1] > 0:
        primary_mode = "hybrid"
        secondary_mode = None

    return TopicProfile(primary_mode, secondary_mode, method_score, problem_score, theory_score)


def infer_topic_mode(topic: TopicRecord) -> str:
    return infer_topic_profile(topic).primary_mode


def _profile_to_dict(profile: TopicProfile) -> Dict[str, Optional[int]]:
    return {
        "primary_mode": profile.primary_mode,
        "secondary_mode": profile.secondary_mode,
        "method_score": profile.method_score,
        "problem_score": profile.problem_score,
        "theory_score": profile.theory_score,
    }


def _path_terms(topic: TopicRecord) -> Set[str]:
    terms = set()
    for segment in topic.hierarchy_path:
        for part in str(segment).replace("/", " ").replace("-", " ").split():
            text = part.strip().lower()
            if text:
                terms.add(text)
    return terms


def _evidence_terms(topic: TopicRecord) -> Set[str]:
    terms = set()
    for evidence in topic.representative_evidence:
        for part in str(evidence).replace("/", " ").replace("-", " ").split():
            text = part.strip().lower().strip(".,:;()[]{}\"'")
            if text:
                terms.add(text)
    return terms


def calibrate_topic_profiles(
    topics: Dict[str, TopicRecord],
    adjacency_edges: Sequence[Dict],
) -> Dict[str, TopicProfile]:
    raw_profiles = {topic_id: infer_topic_profile(topic) for topic_id, topic in topics.items()}
    neighbor_map = _build_neighbor_map(adjacency_edges)
    calibrated = {}

    for topic_id, topic in topics.items():
        profile = raw_profiles[topic_id]
        method_score = profile.method_score
        problem_score = profile.problem_score
        theory_score = profile.theory_score

        path_terms = _path_terms(topic)
        method_score += sum(1 for term in path_terms if term in METHOD_HINTS)
        problem_score += sum(1 for term in path_terms if term in PROBLEM_HINTS)
        theory_score += sum(1 for term in path_terms if term in THEORY_HINTS)

        evidence_terms = _evidence_terms(topic)
        method_score += sum(1 for term in evidence_terms if term in METHOD_HINTS)
        problem_score += sum(1 for term in evidence_terms if term in PROBLEM_HINTS)
        theory_score += sum(1 for term in evidence_terms if term in THEORY_HINTS)

        if method_score == 0 and problem_score == 0 and theory_score == 0:
            neighbor_modes = Counter()
            for neighbor_id, weight in neighbor_map.get(topic_id, [])[:3]:
                neighbor_modes.update([raw_profiles[neighbor_id].primary_mode] * max(1, int(round(weight * 10))))
            most_common = neighbor_modes.most_common(1)
            if most_common:
                inferred = most_common[0][0]
                if inferred == "theory":
                    theory_score = 1
                elif inferred == "problem":
                    problem_score = 1
                elif inferred == "method":
                    method_score = 1
                else:
                    method_score = 1
                    problem_score = 1

        if theory_score >= max(method_score, problem_score) and theory_score > 0:
            secondary_mode = "problem" if problem_score > 0 else ("method" if method_score > 0 else None)
            calibrated[topic_id] = TopicProfile("theory", secondary_mode, method_score, problem_score, theory_score)
            continue

        if method_score > problem_score:
            primary_mode = "method"
            secondary_mode = "problem" if problem_score > 0 else None
        elif problem_score > method_score:
            primary_mode = "problem"
            secondary_mode = "method" if method_score > 0 else None
        elif method_score == 0 and problem_score == 0:
            primary_mode = "hybrid"
            secondary_mode = None
        else:
            primary_mode = "hybrid"
            secondary_mode = None

        calibrated[topic_id] = TopicProfile(primary_mode, secondary_mode, method_score, problem_score, theory_score)
    return calibrated


def classify_transfer_kind(source_profile: TopicProfile, target_profile: TopicProfile) -> str:
    if source_profile.primary_mode == "method" and target_profile.primary_mode == "method":
        return "method_transfer"
    if source_profile.primary_mode == "problem" and target_profile.primary_mode == "problem":
        return "problem_transfer"
    if source_profile.primary_mode == "theory" and target_profile.primary_mode in {"method", "problem", "hybrid"}:
        return "theory_to_applied_transfer"
    if source_profile.primary_mode in {"method", "problem"} and target_profile.primary_mode == "hybrid":
        return "mixed_transfer"
    if source_profile.primary_mode == "hybrid" and target_profile.primary_mode == "method":
        return "method_transfer"
    if source_profile.primary_mode == "hybrid" and target_profile.primary_mode == "problem":
        return "problem_transfer"
    return "mixed_transfer"


def classify_diffusion_kind(source_profile: TopicProfile, target_profile: TopicProfile) -> str:
    if "theory" in {source_profile.primary_mode, target_profile.primary_mode}:
        return "theory_spillover"
    if source_profile.primary_mode == "method" or target_profile.primary_mode == "method":
        if source_profile.primary_mode != "problem" and target_profile.primary_mode != "problem":
            return "method_diffusion"
    if source_profile.primary_mode == "problem" or target_profile.primary_mode == "problem":
        if source_profile.primary_mode != "method" and target_profile.primary_mode != "method":
            return "problem_diffusion"
    if source_profile.secondary_mode == "problem" or target_profile.secondary_mode == "problem":
        return "problem_diffusion"
    if source_profile.secondary_mode == "method" or target_profile.secondary_mode == "method":
        return "method_diffusion"
    return "mixed_diffusion"


def classify_transfer_pattern(
    source_topic: TopicRecord,
    target_topic: TopicRecord,
    source_profile: TopicProfile,
    target_profile: TopicProfile,
) -> str:
    shared_keywords = source_topic.keyword_set & target_topic.keyword_set
    same_name = source_topic.name.strip().lower() == target_topic.name.strip().lower()
    if source_profile.primary_mode == "theory" or target_profile.primary_mode == "theory":
        return "spillover"
    if same_name or len(shared_keywords) >= 3:
        return "migration"
    if (
        source_profile.primary_mode != target_profile.primary_mode
        and len(shared_keywords) >= 2
        and (
            source_profile.secondary_mode == target_profile.primary_mode
            or target_profile.secondary_mode == source_profile.primary_mode
        )
    ):
        return "fusion"
    return "spillover"


def _title_terms(titles: Sequence[str]) -> Set[str]:
    terms = set()
    for title in titles:
        for part in str(title).replace("/", " ").replace("-", " ").split():
            text = part.strip().lower().strip(".,:;()[]{}\"'")
            if len(text) >= 4:
                terms.add(text)
    return terms


def _normalize_name_for_alias(name: str) -> str:
    normalized = str(name).strip().lower()
    for source, target in NAME_ALIASES.items():
        normalized = normalized.replace(source, target)
    for token in (" ", "-", "_", "/", "(", ")", "[", "]"):
        normalized = normalized.replace(token, "")
    return normalized


def detect_alias_risk(anchor: TopicRecord, target: TopicRecord) -> Dict[str, object]:
    anchor_name = _normalize_name_for_alias(anchor.name)
    target_name = _normalize_name_for_alias(target.name)
    if anchor_name and anchor_name == target_name:
        return {"level": "high", "reason": "normalized_name_match"}

    union = len(anchor.keyword_set | target.keyword_set)
    overlap = len(anchor.keyword_set & target.keyword_set) / union if union else 0.0
    if overlap >= 0.8:
        return {"level": "medium", "reason": "high_keyword_overlap"}
    return {"level": "low", "reason": "distinct_concepts"}


def _build_category_flow(anchor: TopicRecord, target: TopicRecord) -> Dict[str, object]:
    source_top = _top_level_category(anchor.category)
    target_top = _top_level_category(target.category)
    if anchor.category == target.category:
        relation = "same_category"
    elif source_top == target_top:
        relation = "same_domain"
    else:
        relation = "cross_domain"
    return {
        "source_category": anchor.category,
        "target_category": target.category,
        "source_top_level": source_top,
        "target_top_level": target_top,
        "relation": relation,
    }


def _topic_terms(topic: TopicRecord) -> Set[str]:
    terms = set(topic.keyword_set)
    for part in topic.name.replace("/", " ").replace("-", " ").split():
        text = part.strip().lower()
        if text:
            terms.add(text)
    terms.update(_path_terms(topic))
    return terms


def _match_taxonomy_classes(terms: Set[str], taxonomy: Dict[str, Set[str]]) -> Dict[str, List[str]]:
    matched = {}
    for class_name, class_terms in taxonomy.items():
        hits = sorted(terms & class_terms)
        if hits:
            matched[class_name] = hits[:6]
    return matched


def _score_taxonomy_overlap(
    anchor_matches: Dict[str, List[str]],
    target_matches: Dict[str, List[str]],
    exact_weight: float = 1.0,
    same_class_weight: float = 0.75,
    related_class_weights: Optional[Dict[Tuple[str, str], float]] = None,
) -> Dict[str, object]:
    exact_terms = set()
    same_classes = []
    related_classes = []
    score = 0.0

    for class_name in sorted(set(anchor_matches) & set(target_matches)):
        anchor_terms = set(anchor_matches[class_name])
        target_terms = set(target_matches[class_name])
        shared = sorted(anchor_terms & target_terms)
        if shared:
            exact_terms.update(shared)
            score += exact_weight
        else:
            same_classes.append(class_name)
            score += same_class_weight

    if related_class_weights:
        anchor_only = sorted(set(anchor_matches) - set(target_matches))
        target_only = sorted(set(target_matches) - set(anchor_matches))
        for left in anchor_only:
            for right in target_only:
                pair = tuple(sorted((left, right)))
                weight = related_class_weights.get(pair)
                if not weight:
                    continue
                related_classes.append({"from": left, "to": right, "weight": weight})
                score += weight

    return {
        "score": round(score, 3),
        "shared_exact_terms": sorted(exact_terms)[:8],
        "shared_classes": same_classes[:8],
        "related_classes": related_classes[:8],
    }


def _build_pipeline_relation(anchor: TopicRecord, target: TopicRecord) -> Dict[str, object]:
    anchor_terms = _topic_terms(anchor)
    target_terms = _topic_terms(target)
    source_hits = sorted(anchor_terms & IMAGING_SOURCE_HINTS)
    target_hits = sorted(target_terms & ANALYSIS_TARGET_HINTS)
    shared_domain_terms = sorted((anchor_terms & target_terms) & {"medical", "clinical", "image", "imaging", "brain", "cancer"})[:6]
    representation_hits = sorted(anchor_terms & REPRESENTATION_SOURCE_HINTS)
    perception_hits = sorted(target_terms & PERCEPTION_TARGET_HINTS)
    shared_3d_terms = sorted((anchor_terms & target_terms) & {"3d", "depth", "scene", "camera", "mapping", "visual", "vision"})[:6]
    shared_formal_terms = sorted((anchor_terms & target_terms) & FORMAL_STRUCTURE_HINTS)[:6]
    theory_domain = _top_level_category(anchor.category) in {"math", "hep"} and _top_level_category(target.category) in {"math", "hep"}
    math_ag_domain = (
        any("math.AG研究" in segment for segment in anchor.hierarchy_path)
        and any("math.AG研究" in segment for segment in target.hierarchy_path)
    )
    math_lo_domain = (
        any("math.LO研究" in segment for segment in anchor.hierarchy_path)
        and any("math.LO研究" in segment for segment in target.hierarchy_path)
    )
    math_lo_modal_domain = (
        math_lo_domain
        and any(segment in {"模态逻辑", "非经典逻辑", "直觉主义逻辑", "概率逻辑"} for segment in anchor.hierarchy_path)
        and any(segment in {"模态逻辑", "非经典逻辑", "直觉主义逻辑", "概率逻辑"} for segment in target.hierarchy_path)
    )
    math_lo_set_domain = (
        math_lo_domain
        and any(segment in {"集合论与基数理论", "力迫法"} for segment in anchor.hierarchy_path)
        and any(segment in {"集合论与基数理论", "力迫法"} for segment in target.hierarchy_path)
    )
    forcing_segments = {"力迫法", "大基数与力迫法", "集合论与基数理论", "集合论与数理逻辑"}
    forcing_domain = (
        any(segment in forcing_segments for segment in anchor.hierarchy_path)
        and any(segment in forcing_segments for segment in target.hierarchy_path)
        and _top_level_category(anchor.category) in {"math", "cs"}
        and _top_level_category(target.category) in {"math", "cs"}
    )
    definability_domain = (
        _top_level_category(anchor.category) in {"math", "cs"}
        and _top_level_category(target.category) in {"math", "cs"}
        and any(segment in {"集合论与基数理论", "逻辑与形式化方法", "集合论与数理逻辑"} for segment in anchor.hierarchy_path)
        and any(segment in {"逻辑与形式化方法", "集合论与数理逻辑"} for segment in target.hierarchy_path)
    )
    type_theory_domain = (
        _top_level_category(anchor.category) in {"math", "cs"}
        and _top_level_category(target.category) in {"math", "cs"}
        and any(segment in {"数理逻辑", "非经典逻辑", "直觉主义逻辑", "逻辑与形式化方法"} for segment in anchor.hierarchy_path)
        and any(segment in {"逻辑与形式化方法", "自动推理与证明"} for segment in target.hierarchy_path)
    )
    shared_math_ag_objects = sorted((anchor_terms & target_terms) & MATH_AG_OBJECT_HINTS)[:6]
    shared_math_ag_methods = sorted((anchor_terms & target_terms) & MATH_AG_METHOD_HINTS)[:6]
    shared_math_lo_objects = sorted((anchor_terms & target_terms) & MATH_LO_FORMAL_OBJECT_HINTS)[:6]
    shared_math_lo_methods = sorted((anchor_terms & target_terms) & MATH_LO_FORMAL_METHOD_HINTS)[:6]
    shared_math_lo_core_objects = sorted((anchor_terms & target_terms) & MATH_LO_CORE_OBJECT_HINTS)[:6]
    shared_math_lo_modal_objects = sorted((anchor_terms & target_terms) & MATH_LO_MODAL_OBJECT_HINTS)[:6]
    shared_math_lo_modal_methods = sorted((anchor_terms & target_terms) & MATH_LO_MODAL_METHOD_HINTS)[:6]
    shared_math_lo_set_objects = sorted((anchor_terms & target_terms) & MATH_LO_SET_OBJECT_HINTS)[:6]
    shared_math_lo_set_methods = sorted((anchor_terms & target_terms) & MATH_LO_SET_METHOD_HINTS)[:6]
    shared_math_lo_forcing_objects = sorted((anchor_terms & target_terms) & MATH_LO_FORCING_OBJECT_HINTS)[:6]
    shared_math_lo_forcing_methods = sorted((anchor_terms & target_terms) & MATH_LO_FORCING_METHOD_HINTS)[:6]
    shared_math_lo_type_objects = sorted((anchor_terms & target_terms) & MATH_LO_TYPE_OBJECT_HINTS)[:6]
    source_type_terms = sorted(anchor_terms & MATH_LO_TYPE_SOURCE_HINTS)[:6]
    target_type_terms = sorted(target_terms & MATH_LO_TYPE_TARGET_HINTS)[:6]
    shared_math_lo_definability_objects = sorted((anchor_terms & target_terms) & MATH_LO_DEFINABILITY_OBJECT_HINTS)[:6]
    shared_math_lo_definability_methods = sorted((anchor_terms & target_terms) & MATH_LO_DEFINABILITY_METHOD_HINTS)[:6]
    # Algebra domain detection
    math_gr_domain = (
        any("math.GR研究" in segment for segment in anchor.hierarchy_path)
        and any("math.GR研究" in segment for segment in target.hierarchy_path)
    )
    math_rt_domain = (
        any("math.RT研究" in segment for segment in anchor.hierarchy_path)
        and any("math.RT研究" in segment for segment in target.hierarchy_path)
    )
    math_ra_domain = (
        any("math.RA研究" in segment for segment in anchor.hierarchy_path)
        and any("math.RA研究" in segment for segment in target.hierarchy_path)
    )
    math_qa_domain = (
        any("math.QA" in segment for segment in anchor.hierarchy_path)
        and any("math.QA" in segment for segment in target.hierarchy_path)
    )
    # Algebra domain shared terms
    shared_math_gr_objects = sorted((anchor_terms & target_terms) & MATH_GR_OBJECT_HINTS)[:6]
    shared_math_gr_methods = sorted((anchor_terms & target_terms) & MATH_GR_METHOD_HINTS)[:6]
    shared_math_rt_objects = sorted((anchor_terms & target_terms) & MATH_RT_OBJECT_HINTS)[:6]
    shared_math_rt_methods = sorted((anchor_terms & target_terms) & MATH_RT_METHOD_HINTS)[:6]
    shared_math_ra_objects = sorted((anchor_terms & target_terms) & MATH_RA_OBJECT_HINTS)[:6]
    shared_math_ra_methods = sorted((anchor_terms & target_terms) & MATH_RA_METHOD_HINTS)[:6]
    shared_math_qa_objects = sorted((anchor_terms & target_terms) & MATH_QA_OBJECT_HINTS)[:6]
    shared_math_qa_methods = sorted((anchor_terms & target_terms) & MATH_QA_METHOD_HINTS)[:6]
    # Analysis domain detection
    math_ap_domain = (
        any("math.AP" in segment for segment in anchor.hierarchy_path)
        and any("math.AP" in segment for segment in target.hierarchy_path)
    )
    math_ca_domain = (
        any("math.CA" in segment for segment in anchor.hierarchy_path)
        and any("math.CA" in segment for segment in target.hierarchy_path)
    )
    math_fa_domain = (
        any("math.FA" in segment for segment in anchor.hierarchy_path)
        and any("math.FA" in segment for segment in target.hierarchy_path)
    )
    math_ds_domain = (
        any("math.DS" in segment for segment in anchor.hierarchy_path)
        and any("math.DS" in segment for segment in target.hierarchy_path)
    )
    # Analysis domain shared terms
    shared_math_ap_objects = sorted((anchor_terms & target_terms) & MATH_AP_OBJECT_HINTS)[:6]
    shared_math_ap_methods = sorted((anchor_terms & target_terms) & MATH_AP_METHOD_HINTS)[:6]
    shared_math_ca_objects = sorted((anchor_terms & target_terms) & MATH_CA_OBJECT_HINTS)[:6]
    shared_math_ca_methods = sorted((anchor_terms & target_terms) & MATH_CA_METHOD_HINTS)[:6]
    shared_math_fa_objects = sorted((anchor_terms & target_terms) & MATH_FA_OBJECT_HINTS)[:6]
    shared_math_fa_methods = sorted((anchor_terms & target_terms) & MATH_FA_METHOD_HINTS)[:6]
    shared_math_ds_objects = sorted((anchor_terms & target_terms) & MATH_DS_OBJECT_HINTS)[:6]
    shared_math_ds_methods = sorted((anchor_terms & target_terms) & MATH_DS_METHOD_HINTS)[:6]
    # Topology domain detection
    math_at_domain = (
        any("math.AT" in segment for segment in anchor.hierarchy_path)
        and any("math.AT" in segment for segment in target.hierarchy_path)
    )
    math_gt_domain = (
        any("math.GT" in segment for segment in anchor.hierarchy_path)
        and any("math.GT" in segment for segment in target.hierarchy_path)
    )
    math_gn_domain = (
        any("math.GN" in segment for segment in anchor.hierarchy_path)
        and any("math.GN" in segment for segment in target.hierarchy_path)
    )
    # Topology domain shared terms
    shared_math_at_objects = sorted((anchor_terms & target_terms) & MATH_AT_OBJECT_HINTS)[:6]
    shared_math_at_methods = sorted((anchor_terms & target_terms) & MATH_AT_METHOD_HINTS)[:6]
    shared_math_gt_objects = sorted((anchor_terms & target_terms) & MATH_GT_OBJECT_HINTS)[:6]
    shared_math_gt_methods = sorted((anchor_terms & target_terms) & MATH_GT_METHOD_HINTS)[:6]
    shared_math_gn_objects = sorted((anchor_terms & target_terms) & MATH_GN_OBJECT_HINTS)[:6]
    shared_math_gn_methods = sorted((anchor_terms & target_terms) & MATH_GN_METHOD_HINTS)[:6]
    # Geometry domain detection
    math_dg_domain = (
        any("math.DG" in segment for segment in anchor.hierarchy_path)
        and any("math.DG" in segment for segment in target.hierarchy_path)
    )
    math_mg_domain = (
        any("math.MG" in segment for segment in anchor.hierarchy_path)
        and any("math.MG" in segment for segment in target.hierarchy_path)
    )
    math_cv_domain = (
        any("math.CV" in segment for segment in anchor.hierarchy_path)
        and any("math.CV" in segment for segment in target.hierarchy_path)
    )
    # Geometry domain shared terms
    shared_math_dg_objects = sorted((anchor_terms & target_terms) & MATH_DG_OBJECT_HINTS)[:6]
    shared_math_dg_methods = sorted((anchor_terms & target_terms) & MATH_DG_METHOD_HINTS)[:6]
    shared_math_mg_objects = sorted((anchor_terms & target_terms) & MATH_MG_OBJECT_HINTS)[:6]
    shared_math_mg_methods = sorted((anchor_terms & target_terms) & MATH_MG_METHOD_HINTS)[:6]
    shared_math_cv_objects = sorted((anchor_terms & target_terms) & MATH_CV_OBJECT_HINTS)[:6]
    shared_math_cv_methods = sorted((anchor_terms & target_terms) & MATH_CV_METHOD_HINTS)[:6]
    anchor_object_matches = _match_taxonomy_classes(anchor_terms, MATH_AG_OBJECT_TAXONOMY)
    target_object_matches = _match_taxonomy_classes(target_terms, MATH_AG_OBJECT_TAXONOMY)
    object_overlap = _score_taxonomy_overlap(
        anchor_object_matches,
        target_object_matches,
        related_class_weights=MATH_AG_OBJECT_CLASS_WEIGHTS,
    )
    anchor_method_matches = _match_taxonomy_classes(anchor_terms, MATH_AG_METHOD_TAXONOMY)
    target_method_matches = _match_taxonomy_classes(target_terms, MATH_AG_METHOD_TAXONOMY)
    method_overlap = _score_taxonomy_overlap(
        anchor_method_matches,
        target_method_matches,
        related_class_weights=MATH_AG_METHOD_CLASS_WEIGHTS,
    )

    if source_hits and target_hits:
        relation = "imaging_to_analysis_same_pipeline"
    elif representation_hits and perception_hits:
        relation = "representation_to_perception_same_pipeline"
    elif math_ag_domain and (
        (len(shared_math_ag_objects) >= 2 and len(object_overlap["exact_terms"]) >= 1)
        or (object_overlap["score"] >= 1.5 and len(object_overlap["exact_terms"]) >= 1)
    ):
        relation = "math_ag_object_continuity"
    elif math_ag_domain and (len(shared_math_ag_methods) >= 2 or method_overlap["score"] >= 1.5):
        relation = "math_ag_method_continuity"
    elif math_lo_modal_domain and len(shared_math_lo_modal_objects) >= 2 and len(shared_math_lo_modal_methods) >= 1:
        relation = "math_lo_modal_continuity"
    elif type_theory_domain and len(shared_math_lo_type_objects) >= 2 and source_type_terms and target_type_terms:
        relation = "math_lo_type_theory_continuity"
    elif (
        definability_domain
        and len(shared_math_lo_definability_methods) >= 1
        and any(term in {"cardinal", "cardinals"} for term in shared_math_lo_definability_objects)
        and any(term in MATH_LO_DEFINABILITY_SPECIAL_OBJECTS for term in shared_math_lo_definability_objects)
    ):
        relation = "math_lo_definability_continuity"
    elif forcing_domain and (
        "axiom" in shared_math_lo_forcing_objects
        and (
            len(shared_math_lo_forcing_objects) >= 4
            or (len(shared_math_lo_forcing_objects) >= 3 and len(shared_math_lo_forcing_methods) >= 1)
        )
    ):
        relation = "math_lo_forcing_continuity"
    elif math_lo_set_domain and (len(shared_math_lo_set_objects) >= 3 or (len(shared_math_lo_set_objects) >= 2 and len(shared_math_lo_set_methods) >= 1)):
        relation = "math_lo_set_theory_continuity"
    elif math_lo_domain and len(shared_math_lo_core_objects) >= 2 and len(shared_math_lo_methods) >= 1:
        relation = "math_lo_formal_system_continuity"
    elif math_gr_domain and (len(shared_math_gr_objects) >= 3 or (len(shared_math_gr_objects) >= 2 and len(shared_math_gr_methods) >= 1)):
        relation = "math_gr_object_continuity"
    elif math_rt_domain and (len(shared_math_rt_objects) >= 3 or (len(shared_math_rt_objects) >= 2 and len(shared_math_rt_methods) >= 1)):
        relation = "math_rt_object_continuity"
    elif math_ra_domain and (len(shared_math_ra_objects) >= 3 or (len(shared_math_ra_objects) >= 2 and len(shared_math_ra_methods) >= 1)):
        relation = "math_ra_object_continuity"
    elif math_qa_domain and (len(shared_math_qa_objects) >= 3 or (len(shared_math_qa_objects) >= 2 and len(shared_math_qa_methods) >= 1)):
        relation = "math_qa_object_continuity"
    elif math_ap_domain and len(shared_math_ap_objects) >= 2 and len(shared_math_ap_methods) >= 1:
        relation = "math_ap_object_continuity"
    elif math_ca_domain and len(shared_math_ca_objects) >= 2 and len(shared_math_ca_methods) >= 1:
        relation = "math_ca_object_continuity"
    elif math_fa_domain and len(shared_math_fa_objects) >= 2 and len(shared_math_fa_methods) >= 1:
        relation = "math_fa_object_continuity"
    elif math_ds_domain and len(shared_math_ds_objects) >= 2 and len(shared_math_ds_methods) >= 1:
        relation = "math_ds_object_continuity"
    elif math_at_domain and len(shared_math_at_objects) >= 2 and len(shared_math_at_methods) >= 1:
        relation = "math_at_object_continuity"
    elif math_gt_domain and len(shared_math_gt_objects) >= 2 and len(shared_math_gt_methods) >= 1:
        relation = "math_gt_object_continuity"
    elif math_gn_domain and len(shared_math_gn_objects) >= 2 and len(shared_math_gn_methods) >= 1:
        relation = "math_gn_object_continuity"
    elif math_dg_domain and len(shared_math_dg_objects) >= 2 and len(shared_math_dg_methods) >= 1:
        relation = "math_dg_object_continuity"
    elif math_mg_domain and len(shared_math_mg_objects) >= 2 and len(shared_math_mg_methods) >= 1:
        relation = "math_mg_object_continuity"
    elif math_cv_domain and len(shared_math_cv_objects) >= 2 and len(shared_math_cv_methods) >= 1:
        relation = "math_cv_object_continuity"
    elif theory_domain and len(shared_formal_terms) >= 2:
        relation = "formal_structure_same_lineage"
    else:
        relation = "none"

    return {
        "relation": relation,
        "source_stage_terms": source_hits[:6],
        "target_stage_terms": target_hits[:6],
        "shared_domain_terms": shared_domain_terms,
        "representation_stage_terms": representation_hits[:6],
        "perception_stage_terms": perception_hits[:6],
        "shared_3d_terms": shared_3d_terms,
        "shared_formal_terms": shared_formal_terms,
        "shared_math_ag_objects": shared_math_ag_objects,
        "shared_math_ag_methods": shared_math_ag_methods,
        "shared_math_lo_objects": shared_math_lo_objects,
        "shared_math_lo_methods": shared_math_lo_methods,
        "shared_math_lo_core_objects": shared_math_lo_core_objects,
        "shared_math_lo_modal_objects": shared_math_lo_modal_objects,
        "shared_math_lo_modal_methods": shared_math_lo_modal_methods,
        "shared_math_lo_set_objects": shared_math_lo_set_objects,
        "shared_math_lo_set_methods": shared_math_lo_set_methods,
        "shared_math_lo_forcing_objects": shared_math_lo_forcing_objects,
        "shared_math_lo_forcing_methods": shared_math_lo_forcing_methods,
        "shared_math_lo_type_objects": shared_math_lo_type_objects,
        "source_type_terms": source_type_terms,
        "target_type_terms": target_type_terms,
        "shared_math_lo_definability_objects": shared_math_lo_definability_objects,
        "shared_math_lo_definability_methods": shared_math_lo_definability_methods,
        "shared_math_gr_objects": shared_math_gr_objects,
        "shared_math_gr_methods": shared_math_gr_methods,
        "shared_math_rt_objects": shared_math_rt_objects,
        "shared_math_rt_methods": shared_math_rt_methods,
        "shared_math_ra_objects": shared_math_ra_objects,
        "shared_math_ra_methods": shared_math_ra_methods,
        "shared_math_qa_objects": shared_math_qa_objects,
        "shared_math_qa_methods": shared_math_qa_methods,
        "shared_math_ap_objects": shared_math_ap_objects,
        "shared_math_ap_methods": shared_math_ap_methods,
        "shared_math_ca_objects": shared_math_ca_objects,
        "shared_math_ca_methods": shared_math_ca_methods,
        "shared_math_fa_objects": shared_math_fa_objects,
        "shared_math_fa_methods": shared_math_fa_methods,
        "shared_math_ds_objects": shared_math_ds_objects,
        "shared_math_ds_methods": shared_math_ds_methods,
        "shared_math_at_objects": shared_math_at_objects,
        "shared_math_at_methods": shared_math_at_methods,
        "shared_math_gt_objects": shared_math_gt_objects,
        "shared_math_gt_methods": shared_math_gt_methods,
        "shared_math_gn_objects": shared_math_gn_objects,
        "shared_math_gn_methods": shared_math_gn_methods,
        "math_ag_object_matches": {
            "anchor": anchor_object_matches,
            "target": target_object_matches,
            "overlap": object_overlap,
        },
        "math_ag_method_matches": {
            "anchor": anchor_method_matches,
            "target": target_method_matches,
            "overlap": method_overlap,
        },
    }


def _build_evidence_title_overlap(anchor: TopicRecord, target: TopicRecord) -> Dict[str, object]:
    anchor_titles = list(anchor.representative_evidence[:2])
    target_titles = list(target.representative_evidence[:2])
    shared_terms = sorted(_title_terms(anchor_titles) & _title_terms(target_titles))[:6]
    return {
        "anchor_titles": anchor_titles,
        "target_titles": target_titles,
        "shared_terms": shared_terms,
        "shared_term_count": len(shared_terms),
    }


def _compute_bridge_strength(
    shared_keywords: Sequence[str],
    bridge_topics: Sequence[str],
    title_overlap: Dict[str, object],
    category_flow: Dict[str, object],
) -> float:
    keyword_component = min(len(shared_keywords) / 4, 1.0) * 0.4
    topic_component = min(len(bridge_topics) / 3, 1.0) * 0.25
    title_component = min(int(title_overlap.get("shared_term_count", 0)) / 3, 1.0) * 0.25
    relation = category_flow.get("relation")
    if relation == "same_category":
        category_component = 0.1
    elif relation == "same_domain":
        category_component = 0.06
    else:
        category_component = 0.03
    return round(keyword_component + topic_component + title_component + category_component, 3)


def build_bridge_evidence(
    anchor: TopicRecord,
    target: TopicRecord,
    neighbors: Sequence[Tuple[str, float]],
    topics: Dict[str, TopicRecord],
) -> Dict[str, object]:
    shared_keywords = sorted((anchor.keyword_set & target.keyword_set))[:6]
    bridge_topics = []
    for neighbor_id, _ in neighbors:
        if neighbor_id == target.topic_id:
            continue
        neighbor = topics[neighbor_id]
        if neighbor.keyword_set & target.keyword_set:
            bridge_topics.append(neighbor.name)
        if len(bridge_topics) >= 3:
            break
    evidence_titles = [title for title in target.representative_evidence[:2] if title]
    category_flow = _build_category_flow(anchor, target)
    pipeline_relation = _build_pipeline_relation(anchor, target)
    title_overlap = _build_evidence_title_overlap(anchor, target)
    alias_risk = detect_alias_risk(anchor, target)
    return {
        "shared_keywords": shared_keywords,
        "bridge_topics": bridge_topics,
        "target_evidence_titles": evidence_titles,
        "category_flow": category_flow,
        "pipeline_relation": pipeline_relation,
        "evidence_title_overlap": title_overlap,
        "bridge_strength": _compute_bridge_strength(shared_keywords, bridge_topics, title_overlap, category_flow),
        "alias_risk": alias_risk,
    }


def build_post_transfer_persistence(
    target: TopicRecord,
    event_period: str,
    periods: Sequence[str],
    lookahead: int = 2,
) -> Dict[str, object]:
    if event_period not in periods:
        return {
            "lookahead_periods": [],
            "active_periods_after_event": 0,
            "paper_counts_after_event": [],
            "sustained": False,
        }
    start_idx = periods.index(event_period) + 1
    future_periods = list(periods[start_idx:start_idx + lookahead])
    paper_counts = [int(target.history_map.get(period, 0)) for period in future_periods]
    active_periods = sum(1 for count in paper_counts if count > 0)
    return {
        "lookahead_periods": future_periods,
        "active_periods_after_event": active_periods,
        "paper_counts_after_event": paper_counts,
        "sustained": active_periods >= min(2, len(future_periods)) if future_periods else False,
    }


def build_relative_persistence(anchor_persistence: Dict[str, object], target_persistence: Dict[str, object]) -> Dict[str, object]:
    anchor_counts = anchor_persistence.get("paper_counts_after_event", [])
    target_counts = target_persistence.get("paper_counts_after_event", [])
    anchor_total = sum(anchor_counts)
    target_total = sum(target_counts)
    if anchor_total == 0:
        ratio = None
        status = "source_dried_up" if target_total == 0 else "target_outlasts_source"
    else:
        ratio = round(target_total / anchor_total, 3)
        if ratio >= 0.8:
            status = "competitive_with_source"
        elif ratio >= 0.3:
            status = "partial_carryover"
        else:
            status = "weak_carryover"
    return {
        "anchor_total": anchor_total,
        "target_total": target_total,
        "target_to_anchor_ratio": ratio,
        "status": status,
    }


def build_consistency_check(
    event_type: str,
    bridge_evidence: Dict[str, object],
    relative_persistence: Dict[str, object],
) -> Dict[str, object]:
    relation = (bridge_evidence.get("category_flow") or {}).get("relation", "unknown")
    pipeline_relation = (bridge_evidence.get("pipeline_relation") or {}).get("relation", "none")
    bridge_strength = float(bridge_evidence.get("bridge_strength", 0.0))
    persistence_status = relative_persistence.get("status", "unknown")
    flags = []

    if pipeline_relation in {
        "imaging_to_analysis_same_pipeline",
        "representation_to_perception_same_pipeline",
        "math_ag_object_continuity",
        "math_ag_method_continuity",
        "math_lo_modal_continuity",
        "math_lo_type_theory_continuity",
        "math_lo_definability_continuity",
        "math_lo_forcing_continuity",
        "math_lo_set_theory_continuity",
        "math_lo_formal_system_continuity",
        "math_gr_object_continuity",
        "math_rt_object_continuity",
        "math_ra_object_continuity",
        "math_qa_object_continuity",
        "math_ap_object_continuity",
        "math_ca_object_continuity",
        "math_fa_object_continuity",
        "math_ds_object_continuity",
        "math_dg_object_continuity",
        "math_mg_object_continuity",
        "math_cv_object_continuity",
        "formal_structure_same_lineage",
    }:
        return {
            "status": "pipeline_consistent",
            "flags": [],
            "relation": relation,
            "pipeline_relation": pipeline_relation,
            "bridge_strength": bridge_strength,
            "relative_persistence_status": persistence_status,
            "event_type": event_type,
        }

    if relation == "same_category" and bridge_strength >= 0.75 and persistence_status == "weak_carryover":
        flags.append("same_category_high_bridge_weak_carryover")
    if relation == "cross_domain" and bridge_strength < 0.45 and persistence_status in {"partial_carryover", "competitive_with_source"}:
        flags.append("cross_domain_low_bridge_but_strong_carryover")
    if bridge_evidence.get("alias_risk", {}).get("level") == "medium":
        flags.append("possible_alias_overlap")

    if flags:
        status = "needs_review"
    else:
        status = "consistent"

    return {
        "status": status,
        "flags": flags,
        "relation": relation,
        "pipeline_relation": pipeline_relation,
        "bridge_strength": bridge_strength,
        "relative_persistence_status": persistence_status,
        "event_type": event_type,
    }


def load_trend_source(input_path: Path) -> Tuple[List[str], Dict[str, TopicRecord]]:
    path = input_path if input_path.exists() else FALLBACK_INPUT
    data = json.loads(path.read_text(encoding="utf-8"))
    periods = list(data.get("periods", []))
    topics = {}

    for topic_id, raw in data.get("trends", {}).items():
        history = tuple(
            sorted(
                (
                    {
                        "period": str(item["period"]),
                        "paper_count": int(item["paper_count"]),
                    }
                    for item in raw.get("history", [])
                    if "period" in item and "paper_count" in item
                ),
                key=lambda item: item["period"],
            )
        )
        keywords = _normalize_keywords(raw.get("keywords", []))
        representative = tuple(raw.get("representative_evidence", []))
        if not representative and raw.get("sample_papers"):
            representative = tuple(
                paper.get("title", "")
                for paper in raw.get("sample_papers", [])
                if isinstance(paper, dict) and paper.get("title")
            )
        topics[topic_id] = TopicRecord(
            topic_id=topic_id,
            name=raw.get("name", topic_id),
            keywords=keywords,
            keyword_set=set(keywords),
            category=raw.get("category", "unknown"),
            subcategory=raw.get("subcategory", ""),
            history=history,
            history_map=_history_map(history),
            total_papers=int(raw.get("total_papers", sum(item["paper_count"] for item in history))),
            active_periods=int(raw.get("active_periods", len(history))),
            hierarchy_path=tuple(raw.get("hierarchy_path", [])),
            hierarchy_depth=int(raw.get("hierarchy_depth", len(raw.get("hierarchy_path", [])) or 0)),
            representative_evidence=representative,
        )
    topics = enrich_with_topics_tree_evidence(topics, TOPICS_TREE_INPUT)
    return periods, topics


def enrich_with_topics_tree_evidence(
    topics: Dict[str, TopicRecord],
    topics_tree_path: Path,
) -> Dict[str, TopicRecord]:
    if not topics_tree_path.exists():
        return topics

    data = json.loads(topics_tree_path.read_text(encoding="utf-8"))
    tree_topics = list(data.get("topics", {}).values())
    exact_name_map = {}
    for item in tree_topics:
        name = item.get("name")
        if name:
            exact_name_map.setdefault(name, []).append(item)

    enriched = {}
    for topic_id, topic in topics.items():
        if topic.representative_evidence:
            enriched[topic_id] = topic
            continue

        candidates = exact_name_map.get(topic.name, [])
        best_item = None
        best_score = 0.0
        target_top = _top_level_category(topic.category)

        if candidates:
            best_item = candidates[0]
        else:
            for item in tree_topics:
                docs = item.get("representative_docs", [])
                doc_categories = {_top_level_category(doc.get("primary_category", "")) for doc in docs if doc.get("primary_category")}
                if target_top and doc_categories and target_top not in doc_categories:
                    continue
                candidate_keywords = {str(k).strip().lower() for k in item.get("keywords", []) if str(k).strip()}
                if not candidate_keywords:
                    continue
                shared = len(topic.keyword_set & candidate_keywords)
                if shared == 0:
                    continue
                union = len(topic.keyword_set | candidate_keywords)
                score = shared / union if union else 0.0
                if item.get("name") == topic.name:
                    score += 0.5
                if score > best_score:
                    best_score = score
                    best_item = item

        if best_item:
            titles = tuple(
                doc.get("title", "")
                for doc in best_item.get("representative_docs", [])
                if isinstance(doc, dict) and doc.get("title")
            )
            if titles:
                enriched[topic_id] = TopicRecord(
                    topic_id=topic.topic_id,
                    name=topic.name,
                    keywords=topic.keywords,
                    keyword_set=topic.keyword_set,
                    category=topic.category,
                    subcategory=topic.subcategory,
                    history=topic.history,
                    history_map=topic.history_map,
                    total_papers=topic.total_papers,
                    active_periods=topic.active_periods,
                    hierarchy_path=topic.hierarchy_path,
                    hierarchy_depth=topic.hierarchy_depth,
                    representative_evidence=titles,
                )
                continue

        enriched[topic_id] = topic
    return enriched


def _shared_prefix_depth(path_a: Sequence[str], path_b: Sequence[str]) -> int:
    depth = 0
    for left, right in zip(path_a, path_b):
        if left != right:
            break
        depth += 1
    return depth


def topic_similarity(left: TopicRecord, right: TopicRecord) -> float:
    if left.topic_id == right.topic_id:
        return 0.0
    shared_keywords = left.keyword_set & right.keyword_set
    if not shared_keywords:
        return 0.0
    union_keywords = left.keyword_set | right.keyword_set
    keyword_score = len(shared_keywords) / len(union_keywords)
    path_prefix = _shared_prefix_depth(left.hierarchy_path, right.hierarchy_path)
    max_depth = max(len(left.hierarchy_path), len(right.hierarchy_path), 1)
    path_score = path_prefix / max_depth
    score = (0.7 * keyword_score) + (0.15 * path_score)
    if left.category == right.category:
        score += 0.1
    if left.subcategory and left.subcategory == right.subcategory:
        score += 0.05
    return round(min(score, 1.0), 4)


def build_candidate_map(topics: Dict[str, TopicRecord]) -> Dict[str, Set[str]]:
    inverted = defaultdict(set)
    for topic_id, topic in topics.items():
        for keyword in topic.keywords:
            inverted[keyword].add(topic_id)

    candidates = defaultdict(set)
    for ids in inverted.values():
        for topic_id in ids:
            candidates[topic_id].update(ids)
    for topic_id in topics:
        candidates[topic_id].discard(topic_id)
    return candidates


def build_adjacency(
    topics: Dict[str, TopicRecord],
    top_k: int = 5,
    min_similarity: float = 0.18,
) -> List[Dict]:
    candidates = build_candidate_map(topics)
    directional = {}

    for topic_id, topic in topics.items():
        scored = []
        for candidate_id in candidates.get(topic_id, set()):
            similarity = topic_similarity(topic, topics[candidate_id])
            if similarity >= min_similarity:
                scored.append((candidate_id, similarity))
        scored.sort(key=lambda item: (-item[1], item[0]))
        for candidate_id, similarity in scored[:top_k]:
            pair = tuple(sorted((topic_id, candidate_id)))
            directional[pair] = max(directional.get(pair, 0.0), similarity)

    edges = []
    for (source, target), similarity in sorted(directional.items()):
        edges.append(
            {
                "source": source,
                "target": target,
                "type": "adjacent_to",
                "weight": similarity,
            }
        )
    return edges


def build_evolves_edges(
    topics: Dict[str, TopicRecord],
    periods: Sequence[str],
    min_similarity: float = 0.24,
) -> List[Dict]:
    period_index = {period: idx for idx, period in enumerate(periods)}
    candidates = build_candidate_map(topics)
    edges = []

    for topic_id, topic in sorted(topics.items()):
        if not topic.first_period:
            continue
        current_idx = period_index.get(topic.first_period)
        if current_idx is None:
            continue
        best: Optional[Tuple[str, float]] = None
        for candidate_id in candidates.get(topic_id, set()):
            candidate = topics[candidate_id]
            if candidate.category != topic.category or not candidate.last_period:
                continue
            previous_idx = period_index.get(candidate.last_period)
            if previous_idx is None or previous_idx >= current_idx:
                continue
            similarity = topic_similarity(topic, candidate)
            gap = current_idx - previous_idx
            if similarity < min_similarity:
                continue
            adjusted = similarity + min(0.06, 0.02 * max(0, 3 - gap))
            if best is None or adjusted > best[1]:
                best = (candidate_id, adjusted)
        if best:
            edges.append(
                {
                    "source": best[0],
                    "target": topic_id,
                    "type": "evolves_from",
                    "weight": round(best[1], 4),
                }
            )
    return edges


def build_topic_graph(
    periods: Sequence[str],
    topics: Dict[str, TopicRecord],
    top_k: int = 5,
    min_similarity: float = 0.18,
) -> Dict:
    categories = sorted({topic.category for topic in topics.values()})
    adjacency_edges = build_adjacency(topics, top_k=top_k, min_similarity=min_similarity)
    evolves_edges = build_evolves_edges(topics, periods, min_similarity=max(min_similarity + 0.06, 0.24))
    calibrated_profiles = calibrate_topic_profiles(topics, adjacency_edges)

    nodes = {
        "topics": [],
        "categories": [{"id": category, "type": "category"} for category in categories],
        "periods": [{"id": period, "type": "period"} for period in periods],
    }
    for topic in sorted(topics.values(), key=lambda item: item.topic_id):
        nodes["topics"].append(
            {
                "id": topic.topic_id,
                "type": "topic",
                "name": topic.name,
                "keywords": list(topic.keywords),
                "category": topic.category,
                "subcategory": topic.subcategory,
                "topic_mode": calibrated_profiles[topic.topic_id].primary_mode,
                "topic_profile": _profile_to_dict(calibrated_profiles[topic.topic_id]),
                "history": list(topic.history),
                "total_papers": topic.total_papers,
                "active_periods": topic.active_periods,
                "hierarchy_path": list(topic.hierarchy_path),
                "hierarchy_depth": topic.hierarchy_depth,
                "related_paths": [],
                "representative_evidence": list(topic.representative_evidence),
            }
        )

    belongs_edges = [
        {"source": topic.topic_id, "target": topic.category, "type": "belongs_to"}
        for topic in sorted(topics.values(), key=lambda item: item.topic_id)
    ]
    active_edges = []
    for topic in sorted(topics.values(), key=lambda item: item.topic_id):
        for item in topic.history:
            active_edges.append(
                {
                    "source": topic.topic_id,
                    "target": item["period"],
                    "type": "active_in",
                    "paper_count": item["paper_count"],
                }
            )

    return {
        "version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "periods": list(periods),
        "nodes": nodes,
        "edges": {
            "belongs_to": belongs_edges,
            "active_in": active_edges,
            "adjacent_to": adjacency_edges,
            "evolves_from": evolves_edges,
        },
    }


def _build_neighbor_map(adjacency_edges: Sequence[Dict]) -> Dict[str, List[Tuple[str, float]]]:
    neighbor_map = defaultdict(list)
    for edge in adjacency_edges:
        neighbor_map[edge["source"]].append((edge["target"], edge["weight"]))
        neighbor_map[edge["target"]].append((edge["source"], edge["weight"]))
    for topic_id, neighbors in neighbor_map.items():
        neighbors.sort(key=lambda item: (-item[1], item[0]))
    return neighbor_map


def _count_at(topic: TopicRecord, period: str) -> int:
    return int(topic.history_map.get(period, 0))


def _eligible_start_period(
    topic: TopicRecord,
    usable_periods: Sequence[str],
    horizon: int,
) -> Optional[str]:
    period_index = {period: idx for idx, period in enumerate(usable_periods)}
    for item in topic.history:
        idx = period_index.get(item["period"])
        if idx is None:
            continue
        if idx + horizon < len(usable_periods):
            return item["period"]
    return None


def select_anchor_topics(
    topics: Dict[str, TopicRecord],
    adjacency_edges: Sequence[Dict],
    periods: Sequence[str],
    horizon: int,
    max_cases: int,
    manual_topic_ids: Optional[Sequence[str]] = None,
    min_total_papers: int = 60,
    min_active_periods: int = 2,
    min_neighbors: int = 2,
) -> List[str]:
    usable_periods = list(periods[:-1]) if len(periods) > 1 else list(periods)
    neighbor_map = _build_neighbor_map(adjacency_edges)

    if manual_topic_ids:
        selected = []
        for topic_id in manual_topic_ids:
            topic = topics.get(topic_id)
            if not topic:
                continue
            if _eligible_start_period(topic, usable_periods, horizon):
                selected.append(topic_id)
        return selected[:max_cases]

    candidates_by_category = defaultdict(list)
    for topic_id, topic in topics.items():
        if topic.total_papers < min_total_papers or topic.active_periods < min_active_periods:
            continue
        if len(neighbor_map.get(topic_id, [])) < min_neighbors:
            continue
        start_period = _eligible_start_period(topic, usable_periods, horizon)
        if not start_period:
            continue
        score = topic.total_papers + (topic.active_periods * 40) + (len(neighbor_map[topic_id]) * 10)
        candidates_by_category[topic.category].append((score, topic_id))

    for values in candidates_by_category.values():
        values.sort(key=lambda item: (-item[0], item[1]))

    selected = []
    categories = sorted(candidates_by_category)
    while len(selected) < max_cases:
        progressed = False
        for category in categories:
            if not candidates_by_category[category]:
                continue
            _, topic_id = candidates_by_category[category].pop(0)
            selected.append(topic_id)
            progressed = True
            if len(selected) >= max_cases:
                break
        if not progressed:
            break
    return selected


def _period_slice(periods: Sequence[str], start_period: str, horizon: int) -> List[str]:
    start_idx = periods.index(start_period)
    end_idx = min(len(periods), start_idx + horizon + 1)
    return list(periods[start_idx:end_idx])


def extract_case_events(
    anchor: TopicRecord,
    start_period: str,
    observation_periods: Sequence[str],
    all_periods: Sequence[str],
    topics: Dict[str, TopicRecord],
    neighbor_map: Dict[str, List[Tuple[str, float]]],
    topic_profiles: Dict[str, TopicProfile],
) -> Tuple[List[Dict], List[Dict], List[str], List[str], List[Dict], List[str], List[Dict]]:
    events = []
    evolution_path = []
    key_supporting_topics = []
    cross_category_moves = []
    key_turning_points = []
    event_types: Set[str] = set()
    anchor_profile = topic_profiles[anchor.topic_id]

    anchor_start = _count_at(anchor, start_period)
    future_periods = list(observation_periods[1:])
    future_anchor_counts = [_count_at(anchor, period) for period in future_periods]
    max_future_anchor = max(future_anchor_counts, default=anchor_start)
    end_anchor = future_anchor_counts[-1] if future_anchor_counts else anchor_start
    future_mean_anchor = (sum(future_anchor_counts) / len(future_anchor_counts)) if future_anchor_counts else anchor_start

    neighbors = neighbor_map.get(anchor.topic_id, [])
    diffused_neighbors = []
    specialized_neighbors = []
    migrating_neighbors = []
    converging_neighbors = []

    for period in observation_periods:
        snapshots = []
        active_neighbors = 0
        for neighbor_id, weight in neighbors:
            neighbor = topics[neighbor_id]
            count = _count_at(neighbor, period)
            if count > 0:
                active_neighbors += 1
            snapshots.append(
                {
                    "topic_id": neighbor_id,
                    "topic_name": neighbor.name,
                    "paper_count": count,
                    "weight": weight,
                    "category": neighbor.category,
                    "topic_mode": topic_profiles[neighbor.topic_id].primary_mode,
                    "topic_profile": _profile_to_dict(topic_profiles[neighbor.topic_id]),
                }
            )
        snapshots.sort(key=lambda item: (-item["paper_count"], -item["weight"], item["topic_id"]))
        evolution_path.append(
            {
                "period": period,
                "anchor_paper_count": _count_at(anchor, period),
                "active_neighbor_count": active_neighbors,
                "top_neighbors": snapshots[:3],
            }
        )

    if anchor.first_period == start_period:
        events.append({"type": "emerged", "period": start_period, "summary": "Anchor topic first appears in the replay window."})
        event_types.add("emerged")

    if max_future_anchor >= max(anchor_start + 10, int(anchor_start * 1.25) if anchor_start else 8):
        growth_period = future_periods[future_anchor_counts.index(max_future_anchor)] if future_periods else start_period
        events.append({"type": "expanded", "period": growth_period, "summary": "Anchor topic grows materially during the replay horizon."})
        event_types.add("expanded")

    for neighbor_id, weight in neighbors:
        neighbor = topics[neighbor_id]
        neighbor_profile = topic_profiles[neighbor.topic_id]
        neighbor_mode = neighbor_profile.primary_mode
        alias_risk = detect_alias_risk(anchor, neighbor)
        if alias_risk["level"] == "high":
            continue
        start_neighbor = _count_at(neighbor, start_period)
        future_counts = [_count_at(neighbor, period) for period in future_periods]
        if not future_counts:
            continue
        peak = max(future_counts)
        peak_period = future_periods[future_counts.index(peak)]
        if peak >= max(start_neighbor + 8, int(start_neighbor * 1.6) if start_neighbor else 6):
            diffused_neighbors.append(
                {
                    "topic_id": neighbor_id,
                    "topic_name": neighbor.name,
                    "category": neighbor.category,
                    "weight": weight,
                    "peak_period": peak_period,
                    "peak_count": peak,
                    "increase": peak - start_neighbor,
                    "topic_mode": neighbor_mode,
                    "topic_profile": _profile_to_dict(neighbor_profile),
                }
            )
        if neighbor.hierarchy_depth > anchor.hierarchy_depth and peak >= max(6, start_neighbor + 6):
            specialized_neighbors.append(
                {
                    "topic_id": neighbor_id,
                    "topic_name": neighbor.name,
                    "peak_period": peak_period,
                    "peak_count": peak,
                    "topic_mode": neighbor_mode,
                    "weight": weight,
                }
            )
        if neighbor.hierarchy_depth < anchor.hierarchy_depth and peak >= max(8, start_neighbor + 8) and end_anchor <= anchor_start:
            converging_neighbors.append(
                {
                    "topic_id": neighbor_id,
                    "topic_name": neighbor.name,
                    "peak_period": peak_period,
                    "peak_count": peak,
                    "topic_mode": neighbor_mode,
                    "weight": weight,
                    "source_category": anchor.category,
                    "target_category": neighbor.category,
                }
            )
        if neighbor.category != anchor.category and peak >= max(6, start_neighbor + 6):
            migrating_neighbors.append(
                {
                    "topic_id": neighbor_id,
                    "topic_name": neighbor.name,
                    "category": neighbor.category,
                    "peak_period": peak_period,
                    "peak_count": peak,
                    "topic_mode": neighbor_mode,
                    "weight": weight,
                    "source_category": anchor.category,
                    "target_category": neighbor.category,
                }
            )

    if diffused_neighbors:
        strongest = max(diffused_neighbors, key=lambda item: (item["increase"], item["weight"], item["topic_id"]))
        target_topic = topics[strongest["topic_id"]]
        target_persistence = build_post_transfer_persistence(target_topic, strongest["peak_period"], all_periods)
        anchor_persistence = build_post_transfer_persistence(anchor, strongest["peak_period"], all_periods)
        bridge_evidence = build_bridge_evidence(anchor, target_topic, neighbors, topics)
        relative_persistence = build_relative_persistence(anchor_persistence, target_persistence)
        events.append(
            {
                "type": "diffused_to_neighbor",
                "period": strongest["peak_period"],
                "summary": f"Semantic neighbors absorb momentum from the anchor topic around {strongest['peak_period']}.",
                "evidence": {
                    "target_topic_id": strongest["topic_id"],
                    "target_topic_name": strongest["topic_name"],
                    "target_topic_mode": strongest["topic_mode"],
                    "transfer_kind": classify_diffusion_kind(anchor_profile, topic_profiles[strongest["topic_id"]]),
                    "transfer_pattern": classify_transfer_pattern(anchor, target_topic, anchor_profile, topic_profiles[strongest["topic_id"]]),
                    "weight": strongest["weight"],
                    "increase": strongest["increase"],
                    "bridge_evidence": bridge_evidence,
                    "post_transfer_persistence": target_persistence,
                    "anchor_post_event_persistence": anchor_persistence,
                    "relative_persistence": relative_persistence,
                    "consistency_check": build_consistency_check("diffused_to_neighbor", bridge_evidence, relative_persistence),
                },
            }
        )
        event_types.add("diffused_to_neighbor")

    if specialized_neighbors:
        first_specialized = sorted(specialized_neighbors, key=lambda item: (item["peak_period"], item["topic_id"]))[0]
        events.append(
            {
                "type": "specialized_into_child",
                "period": first_specialized["peak_period"],
                "summary": "A deeper child-like topic grows within the anchor neighborhood.",
            }
        )
        event_types.add("specialized_into_child")

    if converging_neighbors:
        first_parent = sorted(
            converging_neighbors,
            key=lambda item: (-item["weight"], item["peak_period"], item["topic_id"]),
        )[0]
        target_topic = topics[first_parent["topic_id"]]
        target_persistence = build_post_transfer_persistence(target_topic, first_parent["peak_period"], all_periods)
        anchor_persistence = build_post_transfer_persistence(anchor, first_parent["peak_period"], all_periods)
        bridge_evidence = build_bridge_evidence(anchor, target_topic, neighbors, topics)
        relative_persistence = build_relative_persistence(anchor_persistence, target_persistence)
        events.append(
            {
                "type": "merged_into_parent",
                "period": first_parent["peak_period"],
                "summary": f"Activity appears to reconverge into broader topic {first_parent['topic_name']}.",
                "evidence": {
                    "target_topic_id": first_parent["topic_id"],
                    "target_topic_name": first_parent["topic_name"],
                    "target_topic_mode": first_parent["topic_mode"],
                    "transfer_kind": classify_transfer_kind(anchor_profile, topic_profiles[first_parent["topic_id"]]),
                    "transfer_pattern": classify_transfer_pattern(anchor, target_topic, anchor_profile, topic_profiles[first_parent["topic_id"]]),
                    "weight": first_parent["weight"],
                    "bridge_evidence": bridge_evidence,
                    "post_transfer_persistence": target_persistence,
                    "anchor_post_event_persistence": anchor_persistence,
                    "relative_persistence": relative_persistence,
                    "consistency_check": build_consistency_check("merged_into_parent", bridge_evidence, relative_persistence),
                },
            }
        )
        event_types.add("merged_into_parent")

    if migrating_neighbors:
        first_migration = sorted(
            migrating_neighbors,
            key=lambda item: (-item["weight"], item["peak_period"], item["topic_id"]),
        )[0]
        target_topic = topics[first_migration["topic_id"]]
        target_persistence = build_post_transfer_persistence(target_topic, first_migration["peak_period"], all_periods)
        anchor_persistence = build_post_transfer_persistence(anchor, first_migration["peak_period"], all_periods)
        bridge_evidence = build_bridge_evidence(anchor, target_topic, neighbors, topics)
        relative_persistence = build_relative_persistence(anchor_persistence, target_persistence)
        events.append(
            {
                "type": "migrated_to_new_category",
                "period": first_migration["peak_period"],
                "summary": f"Related growth propagates from {anchor.category} into {first_migration['target_category']}.",
                "evidence": {
                    "source_category": anchor.category,
                    "target_category": first_migration["target_category"],
                    "target_topic_id": first_migration["topic_id"],
                    "target_topic_name": first_migration["topic_name"],
                    "target_topic_mode": first_migration["topic_mode"],
                    "transfer_kind": classify_transfer_kind(anchor_profile, topic_profiles[first_migration["topic_id"]]),
                    "transfer_pattern": classify_transfer_pattern(anchor, target_topic, anchor_profile, topic_profiles[first_migration["topic_id"]]),
                    "weight": first_migration["weight"],
                    "bridge_evidence": bridge_evidence,
                    "post_transfer_persistence": target_persistence,
                    "anchor_post_event_persistence": anchor_persistence,
                    "relative_persistence": relative_persistence,
                    "consistency_check": build_consistency_check("migrated_to_new_category", bridge_evidence, relative_persistence),
                },
            }
        )
        event_types.add("migrated_to_new_category")

    decline_threshold = max(8, int(anchor_start * 0.3)) if anchor_start else 8
    sustained_decline = (
        anchor_start > 0
        and future_periods
        and (anchor_start - end_anchor) >= decline_threshold
        and future_mean_anchor <= (anchor_start * 0.85)
    )
    stabilized = (
        anchor_start > 0
        and future_periods
        and abs(end_anchor - anchor_start) <= max(8, int(anchor_start * 0.2))
        and future_mean_anchor >= (anchor_start * 0.8)
    )
    if sustained_decline and "merged_into_parent" not in event_types:
        weaken_period = future_periods[-1]
        events.append(
            {
                "type": "weakened",
                "period": weaken_period,
                "summary": "Anchor topic shows sustained decline without strong absorption evidence.",
            }
        )
        event_types.add("weakened")
    elif stabilized and "expanded" not in event_types:
        stable_period = future_periods[-1]
        events.append(
            {
                "type": "stabilized",
                "period": stable_period,
                "summary": "Anchor topic settles into a plateau rather than a sharp decline.",
            }
        )
        event_types.add("stabilized")

    key_supporting_topics = sorted(
        diffused_neighbors,
        key=lambda item: (-item["increase"], -item["weight"], item["topic_id"]),
    )[:5]
    cross_category_moves = sorted({item["category"] for item in migrating_neighbors})

    for idx, period in enumerate(future_periods):
        previous = anchor_start if idx == 0 else future_anchor_counts[idx - 1]
        current = future_anchor_counts[idx]
        delta = current - previous
        if abs(delta) >= max(10, int(max(previous, 1) * 0.25)):
            key_turning_points.append(
                {
                    "period": period,
                    "delta": delta,
                    "anchor_paper_count": current,
                }
            )

    return (
        sorted(events, key=lambda item: (item["period"], item["type"])),
        evolution_path,
        sorted(event_types),
        cross_category_moves,
        key_supporting_topics,
        [
            item["topic_id"]
            for item in sorted(
                ({"topic_id": neighbor_id, "weight": weight} for neighbor_id, weight in neighbors),
                key=lambda item: (-item["weight"], item["topic_id"]),
            )[:5]
        ],
        key_turning_points,
    )


def build_case_summary(anchor: TopicRecord, events: Sequence[Dict], start_period: str, end_period: str) -> Tuple[str, str]:
    event_names = [event["type"] for event in events]
    anchor_profile = infer_topic_profile(anchor)
    anchor_mode = anchor_profile.primary_mode
    review_flags = []
    for event in events:
        check = event.get("evidence", {}).get("consistency_check", {})
        review_flags.extend(check.get("flags", []))
    if "expanded" in event_names and "diffused_to_neighbor" in event_names:
        growth = f"{anchor.name} ({anchor_mode}) expands from {start_period} to {end_period} and diffuses into nearby topics."
    elif "expanded" in event_names:
        growth = f"{anchor.name} ({anchor_mode}) strengthens over the replay window ending at {end_period}."
    else:
        growth = f"{anchor.name} ({anchor_mode}) remains active without a strong expansion signal by {end_period}."

    if review_flags:
        growth += " Some transfer links remain flagged for manual review."

    if "weakened" in event_names:
        decline = f"Momentum softens by {end_period}, suggesting the topic loses local centrality."
    elif "merged_into_parent" in event_names:
        decline = f"Some activity appears to reconverge into a broader parent topic by {end_period}."
    elif "stabilized" in event_names:
        decline = f"Activity stabilizes into a plateau by {end_period} instead of collapsing."
    else:
        decline = f"No dominant decline pattern is detected before {end_period}."
    return growth, decline


def analyze_evolution_cases(
    periods: Sequence[str],
    topics: Dict[str, TopicRecord],
    graph: Dict,
    horizon: int = 4,
    max_cases: int = 12,
    manual_topic_ids: Optional[Sequence[str]] = None,
) -> Tuple[Dict, Dict[str, Dict]]:
    usable_periods = list(periods[:-1]) if len(periods) > 1 else list(periods)
    adjacency_edges = graph["edges"]["adjacent_to"]
    neighbor_map = _build_neighbor_map(adjacency_edges)
    topic_profiles = calibrate_topic_profiles(topics, adjacency_edges)
    anchor_topic_ids = select_anchor_topics(
        topics,
        adjacency_edges,
        periods,
        horizon=horizon,
        max_cases=max_cases,
        manual_topic_ids=manual_topic_ids,
    )

    cases = []
    details = {}
    for topic_id in anchor_topic_ids:
        anchor = topics[topic_id]
        start_period = _eligible_start_period(anchor, usable_periods, horizon)
        if not start_period:
            continue
        observation_periods = _period_slice(usable_periods, start_period, horizon)
        if len(observation_periods) <= 1:
            continue
        (
            events,
            evolution_path,
            event_types,
            cross_category_moves,
            key_supporting_topics,
            neighbor_topic_ids,
            key_turning_points,
        ) = extract_case_events(anchor, start_period, observation_periods, periods, topics, neighbor_map, topic_profiles)

        case_id = f"{topic_id}-{start_period}"
        growth_summary, decline_summary = build_case_summary(anchor, events, start_period, observation_periods[-1])
        anchor_profile = topic_profiles[anchor.topic_id]
        detail = {
            "case_id": case_id,
            "anchor_topic_id": topic_id,
            "anchor_topic_name": anchor.name,
            "anchor_topic_mode": anchor_profile.primary_mode,
            "anchor_topic_profile": _profile_to_dict(anchor_profile),
            "start_period": start_period,
            "observation_horizon": len(observation_periods) - 1,
            "neighbor_topics": neighbor_topic_ids,
            "evolution_path": evolution_path,
            "events": events,
            "cross_category_moves": cross_category_moves,
            "growth_summary": growth_summary,
            "decline_summary": decline_summary,
            "review_flags": sorted(
                {
                    flag
                    for event in events
                    for flag in event.get("evidence", {}).get("consistency_check", {}).get("flags", [])
                }
            ),
            "key_supporting_topics": key_supporting_topics,
            "key_turning_points": key_turning_points,
        }
        details[case_id] = detail
        cases.append(
            {
                "case_id": case_id,
                "anchor_topic_id": topic_id,
                "anchor_topic_name": anchor.name,
                "anchor_topic_mode": anchor_profile.primary_mode,
                "anchor_topic_profile": _profile_to_dict(anchor_profile),
                "category": anchor.category,
                "start_period": start_period,
                "observation_horizon": len(observation_periods) - 1,
                "neighbor_topics": neighbor_topic_ids,
                "event_types": event_types,
                "cross_category_moves": cross_category_moves,
                "growth_summary": growth_summary,
                "decline_summary": decline_summary,
                "review_flags": detail["review_flags"],
                "key_supporting_topics": key_supporting_topics,
                "key_turning_points": key_turning_points,
            }
        )

    summary = {
        "version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "analysis_periods": usable_periods,
        "horizon_months": horizon,
        "total_cases": len(cases),
        "cases": sorted(cases, key=lambda item: (item["category"], item["start_period"], item["anchor_topic_id"])),
    }
    return summary, details


def build_report(cases: Sequence[Dict], periods: Sequence[str], topics: Dict[str, TopicRecord]) -> str:
    event_counter = Counter()
    category_counter = Counter()
    for case in cases:
        event_counter.update(case.get("event_types", []))
        category_counter.update([case.get("category", "unknown")])

    lines = [
        "# Evolution Analysis Report",
        "",
        f"- Generated at: {datetime.now(timezone.utc).isoformat()}",
        f"- Analysis periods: {periods[0]} to {periods[-1]}" if periods else "- Analysis periods: none",
        f"- Topics available: {len(topics)}",
        f"- Cases analyzed: {len(cases)}",
        "",
        "## Coverage",
        "",
    ]
    for category, count in sorted(category_counter.items()):
        lines.append(f"- {category}: {count} cases")
    if not category_counter:
        lines.append("- No eligible cases were generated.")

    lines.extend(["", "## Event Frequency", ""])
    for event_name, count in sorted(event_counter.items()):
        lines.append(f"- {event_name}: {count}")
    if not event_counter:
        lines.append("- No evolution events were detected.")

    lines.extend(["", "## Representative Cases", ""])
    for case in list(cases)[:5]:
        event_names = ", ".join(case.get("event_types", [])) or "no dominant events"
        lines.append(
            f"- `{case['anchor_topic_id']}` {case['anchor_topic_name']} ({case['start_period']}): {event_names}"
        )

    lines.extend(
        [
            "",
            "## Schema Blind Spots",
            "",
            "- Topic-level graph misses abstract-level claims, methods, and explicit research questions.",
            "- Migration signals rely on keyword overlap, so weakly lexical cross-field transfers may be undercounted.",
            "- Replay uses completed historical months and excludes the latest month to reduce incomplete-window bias.",
            "",
        ]
    )
    return "\n".join(lines)


def write_outputs(output_dir: Path, graph: Dict, cases: Dict, details: Dict[str, Dict], report: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    detail_dir = output_dir / "evolution_case_detail"
    detail_dir.mkdir(parents=True, exist_ok=True)

    (output_dir / "topic_graph.json").write_text(
        json.dumps(graph, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "evolution_cases.json").write_text(
        json.dumps(cases, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "evolution_report.md").write_text(report, encoding="utf-8")

    for path in detail_dir.glob("*.json"):
        path.unlink()
    for case_id, detail in details.items():
        (detail_dir / f"{case_id}.json").write_text(
            json.dumps(detail, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build topic graph and retrospective evolution cases.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Path to aligned topics JSON.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Directory for generated outputs.")
    parser.add_argument("--horizon", type=int, default=4, help="Replay horizon in months.")
    parser.add_argument("--max-cases", type=int, default=12, help="Maximum number of evolution cases.")
    parser.add_argument(
        "--anchor-topics",
        type=str,
        default="",
        help="Comma-separated global topic ids to analyze. Empty means auto-select.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manual_topic_ids = [item.strip() for item in args.anchor_topics.split(",") if item.strip()]
    periods, topics = load_trend_source(args.input)
    graph = build_topic_graph(periods, topics)
    cases, details = analyze_evolution_cases(
        periods,
        topics,
        graph,
        horizon=args.horizon,
        max_cases=args.max_cases,
        manual_topic_ids=manual_topic_ids or None,
    )
    report = build_report(cases["cases"], cases["analysis_periods"], topics)
    write_outputs(args.output_dir, graph, cases, details, report)
    print(f"Wrote topic graph to {args.output_dir / 'topic_graph.json'}")
    print(f"Wrote evolution cases to {args.output_dir / 'evolution_cases.json'}")
    print(f"Wrote report to {args.output_dir / 'evolution_report.md'}")


if __name__ == "__main__":
    main()

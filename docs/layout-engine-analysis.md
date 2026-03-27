# Graph Layout Engine Analysis

## Current State: Dagre + Post-Layout Fixups

We use **dagre** (MIT) for initial node positioning, followed by **6 post-layout phases** in `ensureControllerSpacing()` to fix issues dagre can't handle:

1. **Phase 1**: Resolve overlapping sibling controller groups (6 passes)
2. **Phase 2**: Push loose nodes away from child controller boxes
3. **Phase 3**: Align input stuff nodes near their target controllers (all controller types, multi-consumer)
4. **Phase 4**: Align nodes within leaf controllers into a single column
5. **Phase 5**: Reorder loose input stuff nodes to minimize edge crossings
6. **Phase 6**: Align stuff nodes with their producer on the cross-axis

Additionally, `buildControllerNodes()` computes controller group bounding boxes after layout, and width/height estimation in dagre is approximated from IO slot counts and CSS constraints.

### Improvements made (2026-03-26)

- Base spacing increased (nodesep 50→80, ranksep 30→70, edgesep 20→30, MIN_GAP 20→30)
- Adaptive pipe card height estimation based on IO slot count
- Pipe card width estimation matches CSS max-width (360px) for cards with 3+ IO slots
- Cross-group edges visually de-emphasized (thinner, semi-transparent)
- Parallel combine edges use smoothstep routing
- Depth-scaled controller padding (+15% per nesting level)
- Overlap resolution passes increased (3→6)
- Phase 3 extended to handle Parallel/Batch/Condition controllers and multi-consumer cases
- Phase 5 and 6 added for input ordering and output alignment

### Remaining limitations

- **Cross-group edge spaghetti**: Edges crossing controller boundaries route through bezier curves that overlap (P09, P12, P15)
- **Batch edges**: batch_item/batch_aggregate edges create long arcs for distant source/target pairs
- **Width/height mismatch**: Dagre estimates dimensions before rendering; actual sizes differ
- **No obstacle-aware routing**: ReactFlow's built-in edge types don't avoid nodes
- **Fundamental issue**: Dagre is a flat layout algorithm. It has no concept of compound/nested graphs. All 6 post-layout phases are workarounds for this.

## Proposed Alternative: ELK (elkjs)

**ELK** (Eclipse Layout Kernel) via `elkjs` natively supports compound/hierarchical graphs.

### Why ELK solves our problems

| Current problem | ELK solution |
|---|---|
| Controller groups containing children | **Compound graphs** — nodes have `children` arrays, ELK layouts inside-out |
| Edges crossing group boundaries | **Cross-hierarchy edge routing** — `hierarchyHandling: 'INCLUDE_CHILDREN'` |
| Output overlapping its card | **Automatic spacing** — ELK computes parent size from children |
| Edge spaghetti | **Orthogonal/spline routing** with obstacle avoidance |
| Input alignment | **Layered algorithm** handles this natively |
| Overlap resolution | **Built-in** — no post-layout fixups needed |
| Port-based connections | **Ports** — edges connect to specific points on nodes |

### ELK graph structure (maps naturally to our data)

```json
{
  "id": "root",
  "layoutOptions": {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    "elk.spacing.nodeNode": "80",
    "elk.layered.spacing.nodeNodeBetweenLayers": "70",
    "elk.edgeRouting": "ORTHOGONAL"
  },
  "children": [
    {
      "id": "sequence_controller",
      "children": [
        { "id": "pipe_node", "width": 360, "height": 160 },
        { "id": "stuff_node", "width": 180, "height": 60 },
        {
          "id": "parallel_controller",
          "children": [ "..." ]
        }
      ],
      "edges": []
    }
  ],
  "edges": []
}
```

### Migration scope

- `graphLayout.ts` — **rewrite**: build ELK graph, replace dagre + all 6 phases
- `graphControllers.ts` — **simplify**: ELK returns parent positions/sizes directly
- `graphBuilders.ts` — **minor**: remove edge type/style workarounds
- `package.json` — add `elkjs`, potentially remove `dagre`
- Types, analysis, React layer, CSS, stories — unchanged

### Key ELK options to configure

- `elk.algorithm: 'layered'` — Sugiyama-based layered algorithm
- `elk.direction: 'RIGHT'` — left-to-right flow
- `elk.hierarchyHandling: 'INCLUDE_CHILDREN'` — compound graph support
- `elk.edgeRouting: 'ORTHOGONAL'` — clean right-angle edges
- `org.eclipse.elk.portConstraints: 'FIXED_ORDER'` — preserves IO slot order
- `elk.spacing.*` — extensive per-element spacing control
- Full reference: https://www.eclipse.org/elk/reference/options.html

### Technical considerations

- **Async API**: `elk.layout()` returns a Promise (dagre is synchronous). Requires minor React integration change.
- **Bundle size**: elkjs adds ~150KB gzipped (the layout engine is compiled from Java via GWT)
- **ReactFlow example**: https://reactflow.dev/examples/layout/elkjs

## License Concern: EPL-2.0

elkjs is licensed under **EPL-2.0** (Eclipse Public License 2.0), a weak copyleft license.

### What EPL-2.0 allows
- Using elkjs as a dependency — your code keeps its own license
- Bundling in commercial applications — fully permitted
- No obligation to open-source your own code

### What EPL-2.0 requires
- Modifications **to elkjs itself** must be released under EPL-2.0
- If distributing elkjs, its source must be available (already on GitHub)

### What EPL-2.0 is NOT
- NOT GPL — does not "infect" your code with copyleft
- NOT viral — only modifications to elkjs are covered

### Risk
Some organizations have blanket policies against any copyleft (even weak) in their dependency tree. This should be evaluated before adopting elkjs.

### Permissively-licensed alternatives

| Library | License | Compound support | Notes |
|---|---|---|---|
| dagre | MIT | No | Current engine, requires extensive fixups |
| d3-dag | Apache-2.0 | No | Sugiyama-based, no compound/nested nodes |
| WebCola | MIT | Partial | Constraint-based, different paradigm |
| Custom dagre wrapper | MIT | Manual | Run dagre per-group, stitch results |

## Decision needed

1. **Is EPL-2.0 acceptable?** → Adopt elkjs, rewrite layout engine
2. **EPL-2.0 is a blocker?** → Continue improving dagre fixup phases, or build a custom per-group dagre wrapper

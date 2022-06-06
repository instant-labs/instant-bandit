import { Experiment, Variant } from "../../lib/models"
import { balanceProbabilities, selectWithProbabilities } from "../../lib/providers/site"
import { ProbabilityDistribution } from "../../lib/types"
import { exists } from "../../lib/utils"


describe("site provider", () => {
  describe(selectWithProbabilities, () => {

    const sum = (probs: ProbabilityDistribution) =>
      Object.keys(probs).map(k => probs[k]).reduce((sum, prob) => sum += prob, 0)

    it("selects the only 1.0 probability", () => {
        const variants: Variant[] = [
          { name: "A", prob: 0 },
          { name: "B", prob: 1 },
          { name: "C", prob: 0 },
        ]
        const winner = selectWithProbabilities({ variants } as Experiment)
        expect(winner!.name).toBe("B")
    })

    it("selects a variant where sum probabilities === 0", () => {
        const variants: Variant[] = [
          { name: "A", prob: 0 },
          { name: "B", prob: 0 },
          { name: "C", prob: 0 },
        ]
        const winner = selectWithProbabilities({ variants } as Experiment)
        expect(exists(winner)).toBe(true)
    })
  })

  describe(balanceProbabilities, () => {

    const sum = (probs: ProbabilityDistribution) =>
      Object.keys(probs).map(k => probs[k]).reduce((sum, prob) => sum += prob, 0)

    it("no probabilities", () => {
      const variants: Variant[] = [
        { name: "A" },
        { name: "B" },
        { name: "C" },
      ]
      const balanced = balanceProbabilities(variants)
      expect(sum(balanced)).toBe(0.9999)
      expect(balanced).toStrictEqual({
        A: 0.3333,
        B: 0.3333,
        C: 0.3333,
      })
    })

    it("all 1", () => {
      const variants: Variant[] = [
        { name: "A", prob: 1.0 },
        { name: "B", prob: 1.0 },
        { name: "C", prob: 1.0 },
      ]
      const balanced = balanceProbabilities(variants)
      expect(sum(balanced)).toBe(0.9999)
      expect(balanced).toStrictEqual({
        A: 0.3333,
        B: 0.3333,
        C: 0.3333,
      })
    })

    it("all 0", () => {
      const variants: Variant[] = [
        { name: "A", prob: 0 },
        { name: "B", prob: 0 },
        { name: "C", prob: 0 },
      ]
      const balanced = balanceProbabilities(variants)
      expect(sum(balanced)).toBe(0.9999)
      expect(balanced).toStrictEqual({
        A: 0.3333,
        B: 0.3333,
        C: 0.3333,
      })
    })

    it("equal probs, sum < 1", () => {
      const variants: Variant[] = [
        { name: "A", prob: 0.1 },
        { name: "B", prob: 0.1 },
        { name: "C", prob: 0.1 },
      ]
      const balanced = balanceProbabilities(variants)
      expect(sum(balanced)).toBe(0.9999)
      expect(balanced).toStrictEqual({
        A: 0.3333,
        B: 0.3333,
        C: 0.3333,
      })
    })

    it("some 0, sum < 1", () => {
      const variants: Variant[] = [
        { name: "A", prob: 0 },
        { name: "B", prob: 0.5 },
        { name: "C", prob: 0 },
      ]
      const balanced = balanceProbabilities(variants)
      expect(sum(balanced)).toBe(1)
      expect(balanced).toStrictEqual({
        A: 0,
        B: 1,
        C: 0,
      })
    })

    it("some 0, sum > 1", () => {
      const variants: Variant[] = [
        { name: "A", prob: 0 },
        { name: "B", prob: 1.5 },
        { name: "C", prob: 0 },
      ]
      const balanced = balanceProbabilities(variants)
      expect(sum(balanced)).toBe(1)
      expect(balanced).toStrictEqual({
        A: 0,
        B: 1,
        C: 0,
      })
    })

    it("mixed probs, sum < 1", () => {
      const variants: Variant[] = [
        { name: "A", prob: 0.1 },
        { name: "B", prob: 0.2 },
        { name: "C", prob: 0.1 },
      ]
      const balanced = balanceProbabilities(variants)
      expect(sum(balanced)).toBe(1)
      expect(balanced).toStrictEqual({
        A: 0.25,
        B: 0.5,
        C: 0.25,
      })
    })

    it("mixed probs, sum > 1", () => {
      const variants: Variant[] = [
        { name: "A", prob: 0.5 },
        { name: "B", prob: 0.75 },
        { name: "C", prob: 0.5 },
      ]
      const balanced = balanceProbabilities(variants)
      expect(sum(balanced)).toBe(1)
      expect(balanced).toStrictEqual({
        A: 0.2857,
        B: 0.4286,
        C: 0.2857,
      })
    })
  })
})

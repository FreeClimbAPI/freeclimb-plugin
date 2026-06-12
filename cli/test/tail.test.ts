import { expect } from "chai"
import { calculateSinceTimestamp } from "../src/tail.js"

describe("Tests the calculateSinceTimestamp", function () {
    it("Checks calculateSinceTimestamp outputs as expected", () => {
        expect(calculateSinceTimestamp("1w1d2h30m2s1ms2us")).to.equal(700202001002)
    })
    it("Checks calculateSinceTimestamp outputs as expected with spaces", () => {
        expect(calculateSinceTimestamp("1w 1d 2h 30m 2s 1ms 2us")).to.equal(700202001002)
    })
    it("Checks calculateSinceTimestamp outputs as expected if units are capital", () => {
        expect(calculateSinceTimestamp("1W 1D 2h 30m 2s 1ms 2us")).to.equal(700202001002)
    })
    it("Checks calculateSinceTimestamp outputs error if starting number is missing", () => {
        expect(function () {
            calculateSinceTimestamp("d 1h")
        }).to.throw("d 1h")
    })
    it("Checks calculateSinceTimestamp outputs error if input is missing a unit", () => {
        expect(function () {
            calculateSinceTimestamp("2d 1")
        }).to.throw("2d 1")
    })
    it("Checks calculateSinceTimestamp outputs error if an unit used is not valid", () => {
        expect(function () {
            calculateSinceTimestamp("2d 1hh")
        }).to.throw("hh")
    })
})

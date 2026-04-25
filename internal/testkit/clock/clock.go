package clock

// Sentinel proves the package compiles end-to-end before any real clock fakes
// land; downstream waves replace it with actual fake/clock plumbing.
const Sentinel = "bootstrapped"

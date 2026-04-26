# Homebrew formula for storyteller.
#
# NOTE: The sha256 values below are PLACEHOLDERS and must be filled in at the
# first release using:
#   shasum -a 256 dist/storyteller-vX.Y.Z-<os>-<arch>.tar.gz
# (see dist/checksums.txt produced by scripts/release.sh)
#
# Why: 公式 tap 公開はスコープ外（後送り）。最小実装としてリポジトリ内に置き、
#      `brew install --build-from-source ./Formula/storyteller.rb` で利用可能。
class Storyteller < Formula
  desc "Story writing as code (SaC) authoring tool"
  homepage "https://github.com/nekowasabi/street-storyteller"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/nekowasabi/street-storyteller/releases/download/v#{version}/storyteller-v#{version}-darwin-arm64.tar.gz"
      sha256 "PLACEHOLDER_DARWIN_ARM64_SHA256"
    end
    on_intel do
      url "https://github.com/nekowasabi/street-storyteller/releases/download/v#{version}/storyteller-v#{version}-darwin-amd64.tar.gz"
      sha256 "PLACEHOLDER_DARWIN_AMD64_SHA256"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/nekowasabi/street-storyteller/releases/download/v#{version}/storyteller-v#{version}-linux-arm64.tar.gz"
      sha256 "PLACEHOLDER_LINUX_ARM64_SHA256"
    end
    on_intel do
      url "https://github.com/nekowasabi/street-storyteller/releases/download/v#{version}/storyteller-v#{version}-linux-amd64.tar.gz"
      sha256 "PLACEHOLDER_LINUX_AMD64_SHA256"
    end
  end

  def install
    # Archives produced by scripts/release.sh contain a single
    # <os>_<arch>/storyteller path; pick whichever exists.
    candidate = Dir["**/storyteller"].find { |p| File.file?(p) }
    odie "storyteller binary not found in archive" if candidate.nil?
    bin.install candidate => "storyteller"
  end

  test do
    system "#{bin}/storyteller", "--version"
  end
end

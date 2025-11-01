// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "InnerVoiceWhisper",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "InnerVoiceWhisper",
            targets: ["InnerVoiceWhisper"]
        )
    ],
    targets: [
        .target(
            name: "InnerVoiceWhisper",
            dependencies: [],
            path: "Sources/InnerVoiceWhisper",
            publicHeadersPath: "include",
            cSettings: [
                .headerSearchPath("../../whisper/include")
            ]
        )
    ]
)

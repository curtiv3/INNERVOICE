cmake_minimum_required(VERSION 3.20)
project(InnerVoiceWhisper LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

option(INNERVOICE_BUILD_IOS "Build frameworks for iOS" OFF)
option(INNERVOICE_BUILD_ANDROID "Build libraries for Android" OFF)

include(FetchContent)

FetchContent_Declare(
    whispercpp
    GIT_REPOSITORY https://github.com/ggerganov/whisper.cpp.git
    GIT_TAG v1.5.4
)

set(WHISPER_BUILD_TESTS OFF CACHE BOOL "Disable whisper.cpp tests" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "Disable whisper.cpp examples" FORCE)
set(WHISPER_BUILD_SHARED_LIB OFF CACHE BOOL "Disable whisper.cpp shared library" FORCE)

FetchContent_MakeAvailable(whispercpp)

add_library(whisper_binding STATIC
    whisper/src/WhisperBridge.cpp
    whisper/src/ModelCache.cpp
)

target_include_directories(whisper_binding
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/whisper/include
        ${whispercpp_SOURCE_DIR}/include
)

target_link_libraries(whisper_binding
    PUBLIC
        whisper
)

target_compile_definitions(whisper_binding
    PRIVATE
        $<$<BOOL:${INNERVOICE_BUILD_IOS}>:INNERVOICE_IOS>
        $<$<BOOL:${INNERVOICE_BUILD_ANDROID}>:INNERVOICE_ANDROID>
)

if(IOS)
    set_target_properties(whisper_binding PROPERTIES
        FRAMEWORK TRUE
        FRAMEWORK_VERSION A
        MACOSX_FRAMEWORK_IDENTIFIER com.innervoice.whisper
        XCODE_ATTRIBUTE_CODE_SIGNING_ALLOWED "NO"
    )
endif()

install(TARGETS whisper_binding
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
    FRAMEWORK DESTINATION Frameworks
    PUBLIC_HEADER DESTINATION include
)


cmake_minimum_required(VERSION 3.22.1)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(INNERVOICE_BUILD_ANDROID ON CACHE BOOL "" FORCE)

add_subdirectory(${CMAKE_CURRENT_LIST_DIR}/../../ ${CMAKE_BINARY_DIR}/innervoice_native)

add_library(whisper_jni SHARED
    WhisperBridgeJNI.cpp
)

target_include_directories(whisper_jni PRIVATE
    ${CMAKE_CURRENT_LIST_DIR}/../../whisper/include
)

target_link_libraries(whisper_jni
    PRIVATE
        whisper_binding
        log
)

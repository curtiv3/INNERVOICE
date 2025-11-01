cmake_minimum_required(VERSION 3.13.0)

project(audiofeatures)

add_library(
  audiofeatures
  SHARED
  src/main/cpp/dsp.cpp
)

target_compile_features(audiofeatures PRIVATE cxx_std_17)

target_link_libraries(
  audiofeatures
  log
)

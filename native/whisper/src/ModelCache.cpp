#include "ModelCache.h"

#include <cstdlib>
#include <fstream>
#include <stdexcept>

namespace fs = std::filesystem;

namespace innervoice {

namespace {
constexpr char kMetadataSuffix[] = ".meta";

void ensure_directory(const fs::path &path) {
    if (!fs::exists(path)) {
        fs::create_directories(path);
    }
}

void write_metadata(const fs::path &path, const ModelInfo &info) {
    std::ofstream meta(path);
    meta << info.name << "\n" << info.url << "\n" << info.size_bytes;
}

bool download_with_curl(const std::string &url, const fs::path &target) {
    const std::string command = "curl -L --fail --silent --show-error '" + url + "' --output '" + target.string() + "'";
    return std::system(command.c_str()) == 0;
}

} // namespace

ModelCache::ModelCache(fs::path cache_dir) : cache_dir_(std::move(cache_dir)) {
    ensure_directory(cache_dir_);
}

fs::path ModelCache::path_for(const ModelInfo &info) const {
    return cache_dir_ / (info.name + ".bin");
}

void ModelCache::download_model(const ModelInfo &info, const fs::path &path) {
    if (info.url.rfind("http", 0) == 0) {
        if (!download_with_curl(info.url, path)) {
            throw std::runtime_error("Failed to download Whisper model with curl");
        }
    } else {
        std::ifstream in(info.url, std::ios::binary);
        std::ofstream out(path, std::ios::binary);
        if (!in.is_open() || !out.is_open()) {
            throw std::runtime_error("Failed to open model source or destination");
        }
        out << in.rdbuf();
    }
    write_metadata(path.string() + kMetadataSuffix, info);
}

fs::path ModelCache::ensure_model(const ModelInfo &info) {
    const fs::path model_path = path_for(info);
    if (!fs::exists(model_path) || fs::file_size(model_path) != info.size_bytes) {
        download_model(info, model_path);
    }
    return model_path;
}

} // namespace innervoice

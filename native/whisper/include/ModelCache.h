#pragma once

#include <filesystem>
#include <optional>
#include <string>

namespace innervoice {

struct ModelInfo {
    std::string name;
    std::string url;
    std::uintmax_t size_bytes;
};

class ModelCache {
  public:
    explicit ModelCache(std::filesystem::path cache_dir);

    [[nodiscard]] std::filesystem::path ensure_model(const ModelInfo &info);
    [[nodiscard]] std::filesystem::path cache_directory() const { return cache_dir_; }

  private:
    std::filesystem::path cache_dir_;
    std::filesystem::path path_for(const ModelInfo &info) const;
    void download_model(const ModelInfo &info, const std::filesystem::path &path);
};

} // namespace innervoice

"""Utilities for loading lightweight embedding models.

The module provides wrappers around ONNX Runtime Mobile and TFLite models
so that the rest of the code base can treat them through a shared interface.
The goal is to keep the dependency surface minimal: both runtimes are
optional, and missing dependencies raise a clear and actionable error.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Sequence


class ModelLoaderError(RuntimeError):
    """Raised when the configured embedding backend cannot be initialised."""


class BaseEmbeddingModel:
    """Abstract interface for lightweight embedding backends."""

    def embed(self, texts: Sequence[str]) -> List[List[float]]:  # pragma: no cover - interface only
        raise NotImplementedError


@dataclass
class OnnxRuntimeEmbeddingModel(BaseEmbeddingModel):
    """Wrapper around an ONNX Runtime Mobile embedding model."""

    model_path: Path
    intra_op_num_threads: int | None = None

    def __post_init__(self) -> None:
        try:
            import onnxruntime as ort  # type: ignore
        except Exception as exc:  # pragma: no cover - exercised only when dependency missing
            raise ModelLoaderError(
                "onnxruntime is required for ONNX embeddings. Install the `onnxruntime` "
                "package compiled for your target platform."
            ) from exc

        session_options = ort.SessionOptions()
        if self.intra_op_num_threads is not None:
            session_options.intra_op_num_threads = self.intra_op_num_threads

        providers = ["CPUExecutionProvider"]
        try:
            self._session = ort.InferenceSession(
                str(self.model_path),
                sess_options=session_options,
                providers=providers,
            )
        except Exception as exc:  # pragma: no cover - initialisation failure
            raise ModelLoaderError(f"Failed to load ONNX model at {self.model_path!s}") from exc

        inputs = self._session.get_inputs()
        if len(inputs) != 1:
            raise ModelLoaderError("Embedding models must expose exactly one input tensor")
        self._input_name = inputs[0].name

        outputs = self._session.get_outputs()
        if len(outputs) != 1:
            raise ModelLoaderError("Embedding models must expose exactly one output tensor")
        self._output_name = outputs[0].name

    def embed(self, texts: Sequence[str]) -> List[List[float]]:
        import numpy as np

        if not texts:
            return []

        input_array = np.array(list(texts), dtype=np.object_)[:, None]
        outputs = self._session.run([self._output_name], {self._input_name: input_array})
        vectors = outputs[0]
        return [vector.tolist() for vector in vectors]


@dataclass
class TFLiteEmbeddingModel(BaseEmbeddingModel):
    """Wrapper around a TensorFlow Lite embedding model."""

    model_path: Path
    num_threads: int | None = None

    def __post_init__(self) -> None:
        try:
            from tflite_runtime.interpreter import Interpreter  # type: ignore
        except Exception as exc:  # pragma: no cover - exercised when dependency missing
            raise ModelLoaderError(
                "tflite_runtime is required for TFLite embeddings. Install the "
                "`tflite-runtime` wheel matching your platform."
            ) from exc

        self._interpreter = Interpreter(model_path=str(self.model_path))
        if self.num_threads is not None:
            try:
                self._interpreter.set_num_threads(self.num_threads)
            except AttributeError:  # pragma: no cover - only on older runtimes
                pass

        self._interpreter.allocate_tensors()
        input_details = self._interpreter.get_input_details()
        if len(input_details) != 1:
            raise ModelLoaderError("Embedding models must expose exactly one input tensor")
        self._input_index = input_details[0]["index"]

        output_details = self._interpreter.get_output_details()
        if len(output_details) != 1:
            raise ModelLoaderError("Embedding models must expose exactly one output tensor")
        self._output_index = output_details[0]["index"]

    def embed(self, texts: Sequence[str]) -> List[List[float]]:
        import numpy as np

        if not texts:
            return []

        vectors: List[List[float]] = []
        for text in texts:
            input_tensor = np.array([text], dtype=np.object_)
            self._interpreter.set_tensor(self._input_index, input_tensor)
            self._interpreter.invoke()
            output_tensor = self._interpreter.get_tensor(self._output_index)
            vectors.append(output_tensor[0].tolist())
        return vectors


def create_embedding_model(
    model_path: str | Path,
    backend: str = "onnx",
    **kwargs,
) -> BaseEmbeddingModel:
    """Factory that builds an embedding model wrapper for the requested backend."""

    path = Path(model_path)
    backend_lower = backend.lower()
    if backend_lower == "onnx":
        return OnnxRuntimeEmbeddingModel(path, **kwargs)
    if backend_lower in {"tflite", "tensorflow-lite"}:
        return TFLiteEmbeddingModel(path, **kwargs)
    raise ModelLoaderError(f"Unsupported embedding backend: {backend}")


__all__ = [
    "BaseEmbeddingModel",
    "ModelLoaderError",
    "OnnxRuntimeEmbeddingModel",
    "TFLiteEmbeddingModel",
    "create_embedding_model",
]

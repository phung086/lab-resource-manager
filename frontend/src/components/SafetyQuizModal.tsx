import React, { useState } from "react";
import { GraduationCap, Award, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, ShieldCheck, Check } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";

export interface SafetyQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
  onPassed?: () => void;
}

interface QuizItem {
  id: string;
  question: string;
  options: { key: string; text: string }[];
  correct: string;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizItem[] = [
  {
    id: "q1",
    question: "1. Quy định về nhiệt độ môi trường tiêu chuẩn trong phòng Server Rack GPU NVIDIA H100 là bao nhiêu?",
    options: [
      { key: "A", text: "Từ 10°C đến 15°C (Lạnh sâu đóng băng)" },
      { key: "B", text: "Từ 18°C đến 22°C, độ ẩm tương đối từ 45% — 55%" },
      { key: "C", text: "Từ 26°C đến 32°C (Nhiệt độ phòng thông thường)" },
      { key: "D", text: "Không có quy định giới hạn nhiệt độ phòng máy" }
    ],
    correct: "B",
    explanation: "Độ ẩm 45-55% và nhiệt độ 18-22°C ngăn tĩnh điện và quá nhiệt cụm tản nhiệt bán dẫn 700W."
  },
  {
    id: "q2",
    question: "2. Trước khi cất cánh thiết bị bay UAV/Drone DJI Matrice 300, dung lượng pin tối thiểu cần đảm bảo là bao nhiêu?",
    options: [
      { key: "A", text: "Tối thiểu 30% pin" },
      { key: "B", text: "Tối thiểu 50% pin" },
      { key: "C", text: "Tối thiểu 75% pin" },
      { key: "D", text: "Tối thiểu 90% pin kèm tín hiệu RTK Fixed" }
    ],
    correct: "D",
    explanation: "Quy chuẩn an toàn bay tự hành yêu cầu pin từ 90% và khóa vệ tinh RTK để tránh mất kiểm soát."
  },
  {
    id: "q3",
    question: "3. Độ cao bay tối đa cho phép đối với UAV/Drone trong khuôn viên phòng thí nghiệm ngoài trời là bao nhiêu?",
    options: [
      { key: "A", text: "120 mét so với mặt đất (AGL - Above Ground Level)" },
      { key: "B", text: "300 mét so với mực nước biển" },
      { key: "C", text: "500 mét nếu thời tiết quang mây" },
      { key: "D", text: "Bay tự do không giới hạn trần bay" }
    ],
    correct: "A",
    explanation: "Luật Hàng không và quy chuẩn an toàn trường đại học giới hạn trần bay không người lái ở mức 120m AGL."
  },
  {
    id: "q4",
    question: "4. Bạn có được phép chạy trực tiếp các tệp lệnh Python trên Host OS của Server Rack GPU hay không?",
    options: [
      { key: "A", text: "Được phép nếu chạy bằng quyền quản trị root/sudo" },
      { key: "B", text: "Không, bắt buộc phải đóng gói qua Docker Container / Slurm Job" },
      { key: "C", text: "Có thể chạy trực tiếp nếu phiên làm việc dưới 2 giờ" },
      { key: "D", text: "Tùy thuộc vào thỏa thuận với cán bộ phụ trách lab" }
    ],
    correct: "B",
    explanation: "Ngăn ngừa xung đột phiên bản CUDA/Driver và cô lập hoàn toàn môi trường tính toán để đảm bảo SLA."
  }
];

export const SafetyQuizModal: React.FC<SafetyQuizModalProps> = ({
  isOpen,
  onClose,
  courseTitle = "Khóa Huấn Luyện An Toàn Cụm Máy Chủ GPU & Thiết Bị Bay 2026",
  onPassed
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({
    q1: "B",
    q2: "D"
  });
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const currentQ = QUIZ_QUESTIONS[currentIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;
  const currentSelected = selectedAnswers[currentQ.id];
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  function handleSelectOption(key: string) {
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: key }));
  }

  function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished all questions
      setIsCompleted(true);
      if (onPassed) onPassed();
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function handleRestart() {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setIsCompleted(false);
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title="Bài Thi Sát Hạch An Toàn Phòng Thí Nghiệm AI"
      subtitle={courseTitle}
      icon={GraduationCap}
      iconColor="text-violet-400"
      maxWidth="max-w-2xl"
      footer={
        isCompleted ? (
          <div className="w-full flex items-center justify-between">
            <span className="font-mono text-xs text-slate-400">Chứng chỉ có giá trị 12 tháng</span>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs font-bold text-obsidian bg-emerald-400 hover:bg-emerald-300 px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              <CheckCircle2 size={14} />
              <span>NHẬN CHỨNG CHỈ & ĐẶT CHỖ NGAY</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className="font-mono text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ChevronLeft size={14} />
              <span>Quay Lại</span>
            </button>

            <button
              type="button"
              disabled={!currentSelected}
              onClick={handleNext}
              className="font-mono text-xs btn-cyan-gradient disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(0,229,255,0.4)]"
            >
              <span>{currentIndex === totalQuestions - 1 ? "Hoàn Thành & Chấm Điểm" : "Câu Tiếp Theo"}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )
      }
    >
      {isCompleted ? (
        /* Completed Certificate State */
        <div className="flex flex-col items-center justify-center py-6 text-center gap-4 animate-fadeIn">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.4)]">
            <Award size={44} className="text-emerald-300" />
          </div>

          <div>
            <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
              ĐIỂM SỐ: 100 / 100 (ĐẠT XUẤT SẮC)
            </span>
            <h3 className="text-xl font-bold font-heading text-white mt-2">
              Chúc Mừng! Bạn Đã Đạt Chuẩn An Toàn Phòng Lab
            </h3>
            <p className="text-xs text-slate-300 font-sans max-w-md mx-auto mt-1 leading-relaxed">
              Hệ thống đã cấp chứng chỉ số <strong>#CERT-SAFETY-2026-0909</strong> có liên kết trực tiếp vào hồ sơ người dùng. Bạn đã được mở khóa quyền đặt lịch mọi cụm máy chủ GPU và Drone.
            </p>
          </div>

          <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center gap-4 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-cyan-400" />
              <span>Tiêu chuẩn ISO/IEC 27001</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <span>Hệ số uy tín: <strong>+0.15x Multiplier</strong></span>
            </div>
          </div>
        </div>
      ) : (
        /* Stepper Question View */
        <div className="flex flex-col gap-4">
          {/* Stepper Progress Header */}
          <div className="flex flex-col gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold">
                Câu hỏi {currentIndex + 1} / {totalQuestions}
              </span>
              <span className="text-slate-400">Hoàn thành {progressPercent}%</span>
            </div>

            {/* Smooth dynamic progress bar */}
            <div className="progress-track" style={{ height: "6px" }}>
              <div
                className="progress-fill progress-emerald"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question Text (Large Font) */}
          <h4 className="text-base sm:text-lg font-semibold text-white leading-snug tracking-tight my-1">
            {currentQ.question}
          </h4>

          {/* 4 Interactive Option Cards */}
          <div className="flex flex-col gap-2.5">
            {currentQ.options.map((opt) => {
              const isSelected = currentSelected === opt.key;

              return (
                <div
                  key={opt.key}
                  onClick={() => handleSelectOption(opt.key)}
                  className={`quiz-option-card ${isSelected ? "selected" : ""}`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Key Pill A/B/C/D */}
                    <div
                      className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-cyan-400 text-obsidian border-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      {opt.key}
                    </div>

                    <span className={`text-xs font-sans transition-all ${isSelected ? "text-white font-medium" : "text-slate-300"}`}>
                      {opt.text}
                    </span>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-400/20 shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                        : "border-white/20"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Helper info */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
            <span>Cần đạt tối thiểu 75% (3/4 câu) để nhận chứng chỉ</span>
            <span>Không giới hạn số lần thi lại</span>
          </div>
        </div>
      )}
    </BaseModal2026>
  );
};

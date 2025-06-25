import GamificationPanel from "@/components/GamificationPanel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Gamification() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Progress & Achievements
          </h1>
          <p className="text-gray-600 mt-2">Track your progress, earn badges, and compete on leaderboards</p>
        </div>

        <GamificationPanel />
      </div>

      <Footer />
    </div>
  );
}
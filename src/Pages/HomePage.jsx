import Hero from "../Components/Hero";

const Homepage = () => {
  return (
    <div className="min-h-screen bg-slate-900">
      <Hero />

      {/* You can add more sections below */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Welcome to PokeShop</h2>
          <p className="mt-4 text-lg text-slate-400">Your premier destination for Pokemon cards</p>
        </div>
      </section>
    </div>
  );
};

export default Homepage;

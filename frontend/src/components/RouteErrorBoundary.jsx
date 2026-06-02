import { Component } from "react";
import { Link } from "react-router-dom";

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[Facturo] Erreur interface", error, info);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="route-error" role="alert">
          <h2>Un problème est survenu</h2>
          <p>{error.message || "Erreur inattendue lors du chargement de la page."}</p>
          <div className="route-error__actions">
            <button type="button" className="route-error__btn" onClick={() => window.location.reload()}>
              Recharger
            </button>
            <Link className="route-error__link" to="/app">
              Tableau de bord
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import {
  createElement,
  setState,
  setEffect,
  createContext,
  setContext,
} from "olovakit";

const RouterContext = createContext({
  navigate: () => {},
  location: {
    pathname: window.location.pathname,
    search: window.location.search,
  },
  params: {},
});

function getPath() {
  return window.location.pathname;
}

function parseQuery(search) {
  if (!search || search === "?") return {};
  return search
    .substring(1)
    .split("&")
    .reduce((params, param) => {
      const [key, value] = param.split("=");
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
      return params;
    }, {});
}

function extractParams(pattern, path) {
  if (!pattern || !path) return null;

  const params = {};

  const regexPattern = pattern
    .replace(/:[a-zA-Z0-9_]+/g, "([^/]+)")
    .replace(/\*/g, "(.*)");

  const regex = new RegExp(`^${regexPattern}$`);
  const matches = path.match(regex);

  if (!matches) return null;

  const paramNames = (pattern.match(/:[a-zA-Z0-9_]+/g) || []).map((param) =>
    param.substring(1)
  );

  paramNames.forEach((name, index) => {
    params[name] = matches[index + 1];
  });

  if (pattern.includes("*") && matches[matches.length - 1]) {
    params.wildcard = matches[matches.length - 1];
  }

  return params;
}

function Router(props) {
  const routes = props.routes || [];
  const fallback = props.fallback;

  const [location, setLocation] = setState({
    pathname: window.location.pathname,
    search: window.location.search,
  });
  const [params, setParams] = setState({});
  const [currentElement, setCurrentElement] = setState(null);

  const navigate = (to, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState(null, "", to);
    } else {
      window.history.pushState(null, "", to);
    }

    setLocation({
      pathname: window.location.pathname,
      search: window.location.search,
    });
  };

  setEffect(() => {
    const handlePopState = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  setEffect(() => {
    const path = location.pathname;
    const queryParams = parseQuery(location.search);
    let foundMatch = false;

    for (const route of routes) {
      if (!route || !route.path) continue;

      const routeParams = extractParams(route.path, path);

      if (routeParams !== null) {
        setParams({ ...routeParams, ...queryParams });
        setCurrentElement(route.element);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      setCurrentElement(
        fallback || createElement("div", null, "404 - Not Found")
      );
    }
  }, [location.pathname, location.search, routes, fallback]);

  return createElement(
    RouterContext.Provider,
    {
      value: {
        navigate,
        location,
        params,
      },
    },
    currentElement
  );
}

function useRouter() {
  return setContext(RouterContext);
}

function Link(props) {
  const { to, children, replace, className, style, ...rest } = props;
  const { navigate } = useRouter();

  const handleClick = (e) => {
    e.preventDefault();
    navigate(to, { replace });
  };

  return createElement(
    "a",
    {
      href: to,
      onClick: handleClick,
      className,
      style,
      ...rest,
    },
    children
  );
}

function Navigate(props) {
  const { to, replace = false } = props;
  const { navigate } = useRouter();

  setEffect(() => {
    navigate(to, { replace });
  }, [to, replace]);

  return null;
}

function Route(props) {

  return null;
}

function Routes(props) {
  const { children, fallback } = props;

  const routeConfigs = Array.isArray(children) ? children : [children];

  const routes = routeConfigs
    .filter((child) => child != null)
    .map((child) => {

      if (child && child.type === Route) {
        return child.props;
      }
      return child;
    });

  return createElement(Router, { routes, fallback });
}

export { Router, Route, Routes, Link, Navigate, useRouter };

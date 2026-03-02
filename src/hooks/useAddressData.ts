"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "https://countriesnow.space/api/v0.1";

interface CountryData {
    name: string;
    iso2: string;
}

interface StateData {
    name: string;
    state_code: string;
}

interface CityData {
    name: string;
}

interface UseAddressDataReturn {
    countries: CountryData[];
    states: StateData[];
    cities: string[];
    loadingCountries: boolean;
    loadingStates: boolean;
    loadingCities: boolean;
    fetchStates: (country: string) => Promise<void>;
    fetchCities: (country: string, state: string) => Promise<void>;
    errorCountries: string | null;
    errorStates: string | null;
    errorCities: string | null;
}

// Module-level caches to persist across component re-renders and instances
const countriesCache: CountryData[] = [];
const statesCache: Record<string, StateData[]> = {};
const citiesCache: Record<string, string[]> = {};

export function useAddressData(): UseAddressDataReturn {
    const [countries, setCountries] = useState<CountryData[]>(countriesCache);
    const [states, setStates] = useState<StateData[]>([]);
    const [cities, setCities] = useState<string[]>([]);

    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const [errorCountries, setErrorCountries] = useState<string | null>(null);
    const [errorStates, setErrorStates] = useState<string | null>(null);
    const [errorCities, setErrorCities] = useState<string | null>(null);

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Fetch all countries on mount
    useEffect(() => {
        if (countriesCache.length > 0) {
            setCountries(countriesCache);
            return;
        }

        const fetchCountries = async () => {
            setLoadingCountries(true);
            setErrorCountries(null);
            try {
                const res = await fetch(`${API_BASE}/countries/positions`);
                const data = await res.json();
                if (!data.error && data.data) {
                    const sortedCountries: CountryData[] = data.data
                        .map((c: { name: string; iso2: string }) => ({
                            name: c.name,
                            iso2: c.iso2,
                        }))
                        .sort((a: CountryData, b: CountryData) => a.name.localeCompare(b.name));

                    // Populate module-level cache
                    countriesCache.length = 0;
                    countriesCache.push(...sortedCountries);

                    if (mountedRef.current) {
                        setCountries(sortedCountries);
                    }
                } else {
                    if (mountedRef.current) {
                        setErrorCountries("Failed to load countries.");
                    }
                }
            } catch (err) {
                console.error("Failed to fetch countries:", err);
                if (mountedRef.current) {
                    setErrorCountries("Network error loading countries.");
                }
            } finally {
                if (mountedRef.current) {
                    setLoadingCountries(false);
                }
            }
        };

        fetchCountries();
    }, []);

    // Fetch states for a given country
    const fetchStates = useCallback(async (country: string) => {
        if (!country) {
            setStates([]);
            setCities([]);
            return;
        }

        // Check cache first
        if (statesCache[country]) {
            setStates(statesCache[country]);
            setCities([]);
            return;
        }

        setLoadingStates(true);
        setErrorStates(null);
        setStates([]);
        setCities([]);

        try {
            const res = await fetch(`${API_BASE}/countries/states`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ country }),
            });
            const data = await res.json();

            if (!data.error && data.data?.states) {
                const sortedStates: StateData[] = data.data.states
                    .map((s: { name: string; state_code: string }) => ({
                        name: s.name,
                        state_code: s.state_code || "",
                    }))
                    .sort((a: StateData, b: StateData) => a.name.localeCompare(b.name));

                statesCache[country] = sortedStates;

                if (mountedRef.current) {
                    setStates(sortedStates);
                }
            } else {
                if (mountedRef.current) {
                    setErrorStates("No states found for this country.");
                }
            }
        } catch (err) {
            console.error("Failed to fetch states:", err);
            if (mountedRef.current) {
                setErrorStates("Network error loading states.");
            }
        } finally {
            if (mountedRef.current) {
                setLoadingStates(false);
            }
        }
    }, []);

    // Fetch cities for a given country + state
    const fetchCities = useCallback(async (country: string, state: string) => {
        if (!country || !state) {
            setCities([]);
            return;
        }

        const cacheKey = `${country}__${state}`;

        // Check cache first
        if (citiesCache[cacheKey]) {
            setCities(citiesCache[cacheKey]);
            return;
        }

        setLoadingCities(true);
        setErrorCities(null);
        setCities([]);

        try {
            const res = await fetch(`${API_BASE}/countries/state/cities`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ country, state }),
            });
            const data = await res.json();

            if (!data.error && data.data) {
                const sortedCities: string[] = [...data.data].sort((a: string, b: string) =>
                    a.localeCompare(b)
                );

                citiesCache[cacheKey] = sortedCities;

                if (mountedRef.current) {
                    setCities(sortedCities);
                }
            } else {
                if (mountedRef.current) {
                    setErrorCities("No cities found for this state.");
                }
            }
        } catch (err) {
            console.error("Failed to fetch cities:", err);
            if (mountedRef.current) {
                setErrorCities("Network error loading cities.");
            }
        } finally {
            if (mountedRef.current) {
                setLoadingCities(false);
            }
        }
    }, []);

    return {
        countries,
        states,
        cities,
        loadingCountries,
        loadingStates,
        loadingCities,
        fetchStates,
        fetchCities,
        errorCountries,
        errorStates,
        errorCities,
    };
}

"""
binomial_lab.py
Laboratory Activity for Group 6: Calculating Probabilities
Combinatorics + Binomial probabilities

This module provides:
  - nCk(n, k)          : safe combination count (int)
  - binomial_pmf(n,k,p): exact binomial probability P(X = k)
  - simulate(n,k,p,trials) : Monte Carlo estimate of P(X = k)

Example (matches the activity sheet):
    n = 10, k = 3, p = 0.5
    Exact P(X = 3) for Bin(10, 0.5) = 0.117188
    Simulated P_hat = 0.11745 (approx)
"""

from random import random


def nCk(n: int, k: int) -> int:
    """Return C(n, k) = n! / (k! (n-k)!) safely using integer arithmetic."""
    if k < 0 or k > n:
        return 0
    if k > n - k:
        k = n - k
    res = 1
    for i in range(1, k + 1):
        res = res * (n - k + i) // i
    return res


def binomial_pmf(n: int, k: int, p: float) -> float:
    """Exact binomial probability P(X = k) for X ~ Binomial(n, p)."""
    return nCk(n, k) * (p ** k) * ((1 - p) ** (n - k))


def simulate(n: int, k: int, p: float, trials: int = 200_000) -> float:
    """Monte Carlo estimate of P(X = k) using Bernoulli trials."""
    count = 0
    for _ in range(trials):
        successes = 0
        for _ in range(n):
            if random() < p:
                successes += 1
        if successes == k:
            count += 1
    return count / trials


def main() -> None:
    # --- Parameters as specified in the laboratory activity ---
    n = 10
    k = 3
    p = 0.5

    exact = binomial_pmf(n, k, p)
    print(f"Exact P(X={k}) for Bin({n},{p}) = {exact:.6f}")

    # --- Simulation ---
    trials = 200_000
    p_hat = simulate(n, k, p, trials)
    print(f"Simulated P_hat = {p_hat:.6f}")

    # --- Extra demonstration: vary p (Step 5 of activity) ---
    print("\n--- Peer interaction: vary p ---")
    for p_val in (0.3, 0.5, 0.7):
        exact_val = binomial_pmf(n, k, p_val)
        p_hat_val = simulate(n, k, p_val, trials)
        print(f"p={p_val}: exact={exact_val:.6f}, sim={p_hat_val:.6f}")


if __name__ == "__main__":
    main()
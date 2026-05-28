import React from 'react';

/**
 * Generic empty/coming-soon state for tabs that don't have a backend yet.
 */
export default function EmptyTab({ tabLabel = 'Section', comingSoon = false }) {
    return (
        <div className="lp-empty" data-testid={`empty-tab-${tabLabel.toLowerCase().replace(/\s/g, '-')}`}>
            <h4>{tabLabel}</h4>
            {comingSoon ? (
                <p>This section is coming soon.</p>
            ) : (
                <p>No data to display.</p>
            )}
        </div>
    );
}

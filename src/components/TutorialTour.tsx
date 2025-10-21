import { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function TutorialTour() {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const { theme } = useTheme();

  const buildSteps = (isMobile: boolean): Step[] => {
    const commonFirst: Step = {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Welcome to EVERCASH! 🎉</h3>
          <p>Let's take a quick tour to help you get started with managing your finances.</p>
          <p className="text-sm text-muted-foreground">This will take about 2 minutes. You can skip or go back at any time.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    };

    const commonLast: Step = {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">You're all set! 🚀</h3>
          <p>Start by adding your first account, then import or manually add transactions.</p>
          <p className="text-sm text-muted-foreground">Need help? Click the Tutorial button anytime to revisit this tour.</p>
        </div>
      ),
      placement: 'center',
    };

    if (isMobile) {
      return [
        commonFirst,
        {
          target: '[data-tutorial="mobile-menu-button"]',
          content: (
            <div className="space-y-2">
              <h4 className="font-bold">Accounts</h4>
              <p>Tap the menu, then open <strong>Accounts</strong> to add your bank, card, or cash accounts.</p>
              <p className="text-sm text-muted-foreground">You can manage accounts any time from the menu.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tutorial="transactions-nav"]',
          content: (
            <div className="space-y-2">
              <h4 className="font-bold">Transactions</h4>
              <p>Track all your income and expenses. Add, edit, or import transactions here.</p>
            </div>
          ),
          placement: 'top',
        },
        {
          target: '[data-tutorial="budgets-nav"]',
          content: (
            <div className="space-y-2">
              <h4 className="font-bold">Budgets</h4>
              <p>Set monthly budgets per category and stay on track.</p>
            </div>
          ),
          placement: 'top',
        },
        {
          target: '[data-tutorial="goals-nav"]',
          content: (
            <div className="space-y-2">
              <h4 className="font-bold">Goals</h4>
              <p>Create goals (e.g., Emergency Fund, Vacation) and allocate surplus.</p>
            </div>
          ),
          placement: 'top',
        },
        {
          target: '[data-tutorial="reports-nav"]',
          content: (
            <div className="space-y-2">
              <h4 className="font-bold">Reports</h4>
              <p>Visualize spending trends and track net worth.</p>
            </div>
          ),
          placement: 'top',
        },
        {
          target: '[data-tutorial="import-button"]',
          content: (
            <div className="space-y-2">
              <h4 className="font-bold">Import Transactions</h4>
              <p>Quickly import CSV/PDF statements. AI auto-categorizes for you.</p>
            </div>
          ),
          placement: 'bottom',
        },
        commonLast,
      ];
    }

    // Desktop
    return [
      commonFirst,
      {
        target: '[data-tutorial="accounts-nav"]',
        content: (
          <div className="space-y-2">
            <h4 className="font-bold">Accounts</h4>
            <p>Start by adding your bank accounts, credit cards, or cash accounts here.</p>
            <p className="text-sm text-muted-foreground">Click to open the Accounts page.</p>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-tutorial="transactions-nav"]',
        content: (
          <div className="space-y-2">
            <h4 className="font-bold">Transactions</h4>
            <p>Track all your income and expenses in one place.</p>
            <p className="text-sm text-muted-foreground">You can add, edit, or import transactions here.</p>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-tutorial="budgets-nav"]',
        content: (
          <div className="space-y-2">
            <h4 className="font-bold">Budgets</h4>
            <p>Set monthly budgets for different categories to control your spending.</p>
            <p className="text-sm text-muted-foreground">EVERCASH helps you stay on track with visual indicators.</p>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-tutorial="goals-nav"]',
        content: (
          <div className="space-y-2">
            <h4 className="font-bold">Goals</h4>
            <p>Set financial goals like "Emergency Fund" or "Vacation Savings".</p>
            <p className="text-sm text-muted-foreground">Track your progress and allocate surplus budget to goals.</p>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-tutorial="reports-nav"]',
        content: (
          <div className="space-y-2">
            <h4 className="font-bold">Reports</h4>
            <p>Visualize your spending patterns with charts and insights.</p>
            <p className="text-sm text-muted-foreground">See where your money goes and track your net worth.</p>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-tutorial="import-button"]',
        content: (
          <div className="space-y-2">
            <h4 className="font-bold">Import Transactions</h4>
            <p>Quickly import transactions from your bank statements (CSV or PDF).</p>
            <p className="text-sm text-muted-foreground">AI-powered categorization makes it effortless!</p>
          </div>
        ),
        placement: 'bottom',
      },
      commonLast,
    ];
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRun(false);
    }
  };

  const startTutorial = () => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    setSteps(buildSteps(isMobile));
    setRun(true);
  };

  return (
    <>
      <Button
        onClick={startTutorial}
        variant="outline"
        data-tutorial="tutorial-button"
        className={`font-semibold text-xs md:text-sm px-2 md:px-3 py-2 whitespace-nowrap ${
          theme === 'dark'
            ? 'border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300'
            : 'border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
        }`}
      >
        <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
        <span className="hidden sm:inline">Tutorial</span>
      </Button>

      <Joyride
        steps={steps}
        run={run}
        continuous
        scrollToFirstStep
        spotlightClicks
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: theme === 'dark' ? '#10b981' : '#059669',
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            textColor: theme === 'dark' ? '#f3f4f6' : '#1f2937',
            arrowColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
          },
          buttonNext: {
            backgroundColor: theme === 'dark' ? '#10b981' : '#059669',
            color: theme === 'dark' ? '#000' : '#fff',
            fontWeight: 600,
          },
          buttonBack: {
            color: theme === 'dark' ? '#10b981' : '#059669',
            fontWeight: 600,
          },
          buttonSkip: {
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          },
          tooltip: {
            borderRadius: '12px',
            padding: '20px',
          },
          tooltipContent: {
            padding: '10px 0',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tutorial',
        }}
      />
    </>
  );
}

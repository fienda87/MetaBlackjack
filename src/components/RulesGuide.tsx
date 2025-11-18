'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  TrendingUp, 
  DollarSign,
  HelpCircle,
  BookOpen,
  Zap,
  Shield,
  Star
} from 'lucide-react'

export default function RulesGuide() {
  const [activeSection, setActiveSection] = useState('objective')

  const sections = [
    { id: 'objective', label: 'Objective', icon: Target },
    { id: 'values', label: 'Card Values', icon: Star },
    { id: 'actions', label: 'Actions', icon: Zap },
    { id: 'payouts', label: 'Payouts', icon: DollarSign },
    { id: 'strategy', label: 'Basic Strategy', icon: TrendingUp },
    { id: 'tips', label: 'Pro Tips', icon: Shield }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'objective':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-green-400">Game Objective</h3>
            <p className="text-green-300 leading-relaxed">
              The goal of Blackjack is to beat the dealer by having a hand value closer to 21 than the dealer's hand, 
              without exceeding 21 (going "bust"). It's a game of skill combined with luck, where strategic decisions 
              can significantly improve your odds of winning.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-400 mb-2">Winning Conditions</h4>
                  <ul className="text-green-300 space-y-1 text-sm">
                    <li>• Your hand value is closer to 21 than dealer's</li>
                    <li>• Dealer busts (exceeds 21) while you don't</li>
                    <li>• You get Blackjack (21 with 2 cards) and dealer doesn't</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-400 mb-2">Losing Conditions</h4>
                  <ul className="text-green-300 space-y-1 text-sm">
                    <li>• Your hand value exceeds 21 (bust)</li>
                    <li>• Dealer's hand is closer to 21 than yours</li>
                    <li>• Both bust - dealer wins (house advantage)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'values':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-green-400">Card Values</h3>
            <p className="text-green-300 leading-relaxed">
              Understanding card values is fundamental to Blackjack strategy. Each card has a specific point value 
              that contributes to your hand total.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-400 mb-3">Number Cards (2-10)</h4>
                  <p className="text-green-300 text-sm mb-3">Worth their face value</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <div key={num} className="bg-black/50 rounded p-2 text-center text-green-400 font-bold">
                        {num}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-400 mb-3">Face Cards (J, Q, K)</h4>
                  <p className="text-green-300 text-sm mb-3">Each worth 10 points</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['J', 'Q', 'K'].map(face => (
                      <div key={face} className="bg-black/50 rounded p-2 text-center text-green-400 font-bold text-lg">
                        {face}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-400 mb-3">Ace (A)</h4>
                  <p className="text-green-300 text-sm mb-3">Flexible value: 1 or 11</p>
                  <div className="bg-black/50 rounded p-4 text-center">
                    <div className="text-green-400 font-bold text-lg">A</div>
                    <div className="text-green-300 text-xs mt-1">1 or 11</div>
                  </div>
                  <p className="text-green-300 text-xs mt-2">
                    Automatically chooses best value to avoid busting
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'actions':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-green-400">Player Actions</h3>
            <p className="text-green-300 leading-relaxed">
              As a player, you have several strategic options available during your turn. Each action should be 
              chosen based on your hand value and the dealer's visible card.
            </p>
            <div className="space-y-4 mt-6">
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-green-600 text-black">Hit</Badge>
                    <span className="text-green-400 font-semibold">Draw another card</span>
                  </div>
                  <p className="text-green-300 text-sm">
                    Use when your hand is weak (typically 11 or less) and you want to improve your total.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-yellow-600 text-black">Stand</Badge>
                    <span className="text-green-400 font-semibold">Keep current hand</span>
                  </div>
                  <p className="text-green-300 text-sm">
                    Use when you have a strong hand (typically 17+) or want to play conservatively.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-blue-600 text-white">Double Down</Badge>
                    <span className="text-green-400 font-semibold">Double bet, take one card</span>
                  </div>
                  <p className="text-green-300 text-sm">
                    Available on first two cards. Best with hand totals of 10 or 11 against weak dealer cards.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-purple-600 text-white">Split</Badge>
                    <span className="text-green-400 font-semibold">Split pairs into two hands</span>
                  </div>
                  <p className="text-green-300 text-sm">
                    When first two cards have same value. Requires additional bet equal to original.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'payouts':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-green-400">Enhanced Payout Structure</h3>
            <p className="text-green-300 leading-relaxed">
              Gobog Blackjack offers competitive payout rates with instant settlement in GBC (GOBOG COIN). All winnings 
              are automatically credited to your account. Win bigger with our special bonus combinations!
            </p>
            
            {/* Standard Payouts */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-green-400 mb-3">Standard Payouts</h4>
              <div className="space-y-3">
                <Card className="bg-gradient-to-r from-green-900/30 to-green-800/20 border-green-600/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-green-400">Blackjack</h4>
                        <p className="text-green-300 text-sm">Natural 21 with first two cards</p>
                      </div>
                      <Badge className="bg-green-600 text-black text-lg px-3 py-1">3:2</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-900/20 border-green-800/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-green-400">Regular Win</h4>
                        <p className="text-green-300 text-sm">Beat dealer without busting</p>
                      </div>
                      <Badge className="bg-green-600 text-black text-lg px-3 py-1">1:1</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-900/20 border-green-800/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-green-400">Push (Tie)</h4>
                        <p className="text-green-300 text-sm">Same value as dealer</p>
                      </div>
                      <Badge className="bg-yellow-600 text-black text-lg px-3 py-1">1:1</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-900/20 border-green-800/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-green-400">Insurance</h4>
                        <p className="text-green-300 text-sm">When dealer shows Ace</p>
                      </div>
                      <Badge className="bg-blue-600 text-white text-lg px-3 py-1">2:1</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Special Bonus Payouts */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-purple-400 mb-3">🎯 Special Bonus Combinations</h4>
              <div className="space-y-3">
                <Card className="bg-gradient-to-r from-purple-900/30 to-purple-800/20 border-purple-600/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-purple-400">Triple 7s</h4>
                        <p className="text-purple-300 text-sm">Three 7s in your hand</p>
                      </div>
                      <Badge className="bg-purple-600 text-white text-lg px-3 py-1">4:1</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-purple-900/30 to-purple-800/20 border-purple-600/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-purple-400">Perfect Pair</h4>
                        <p className="text-purple-300 text-sm">First two cards same rank</p>
                      </div>
                      <Badge className="bg-purple-600 text-white text-lg px-3 py-1">2:1</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-purple-900/30 to-purple-800/20 border-purple-600/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-purple-400">Flush Bonus</h4>
                        <p className="text-purple-300 text-sm">All cards same suit</p>
                      </div>
                      <Badge className="bg-purple-600 text-white text-lg px-3 py-1">0.5:1</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-purple-900/30 to-purple-800/20 border-purple-600/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-purple-400">Straight Bonus</h4>
                        <p className="text-purple-300 text-sm">Sequential cards</p>
                      </div>
                      <Badge className="bg-purple-600 text-white text-lg px-3 py-1">0.3:1</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-900/10 rounded-lg">
              <h4 className="text-green-400 font-semibold mb-2">GOBOG COIN (GBC)</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-green-600 text-green-400">
                  GBC (GOBOG COIN)
                </Badge>
              </div>
              <p className="text-green-300 text-sm mt-2">
                Our proprietary gaming coin for the best blackjack experience!
              </p>
            </div>
          </div>
        )

      case 'strategy':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-green-400">Basic Strategy Guide</h3>
            <p className="text-green-300 leading-relaxed">
              Follow these proven strategies to maximize your odds of winning. Basic strategy reduces the house 
              edge to less than 1% when played correctly.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-400 mb-3">Hard Hands (No Ace)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-green-300">
                      <span>8 or less:</span>
                      <span className="text-green-400">Always Hit</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>9:</span>
                      <span className="text-green-400">Hit if dealer 2-6, Double 7-Ace</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>10-11:</span>
                      <span className="text-green-400">Double if dealer 2-9, Hit 10-Ace</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>12-16:</span>
                      <span className="text-green-400">Stand if dealer 2-6, Hit 7-Ace</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>17+:</span>
                      <span className="text-green-400">Always Stand</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-400 mb-3">Soft Hands (With Ace)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-green-300">
                      <span>Ace-2 to Ace-5:</span>
                      <span className="text-green-400">Hit or Double</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>Ace-6 to Ace-7:</span>
                      <span className="text-green-400">Double 2-6, Hit 7-Ace</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>Ace-8 to Ace-9:</span>
                      <span className="text-green-400">Always Stand</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-green-900/20 border-green-800/50 mt-4">
              <CardContent className="p-4">
                <h4 className="font-semibold text-green-400 mb-3">Pair Splitting Rules</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-300 font-semibold mb-2">Always Split:</p>
                    <ul className="text-green-300 space-y-1">
                      <li>• Aces</li>
                      <li>• 8s</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-green-300 font-semibold mb-2">Never Split:</p>
                    <ul className="text-green-300 space-y-1">
                      <li>• 10s, Jacks, Queens, Kings</li>
                      <li>• 5s (Double instead)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'tips':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-green-400">Pro Tips & Best Practices</h3>
            <p className="text-green-300 leading-relaxed">
              Master these advanced techniques to gain an edge over the casino and manage your bankroll effectively.
            </p>
            
            <div className="space-y-4 mt-6">
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-green-400 mb-2">Bankroll Management</h4>
                      <p className="text-green-300 text-sm">
                        Set strict limits and never bet more than 2% of your total bankroll on a single hand. 
                        This ensures you can weather losing streaks and stay in the game longer.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-green-400 mb-2">Card Counting Basics</h4>
                      <p className="text-green-300 text-sm">
                        While advanced card counting requires practice, understanding the concept helps. 
                        Track high vs low cards to estimate deck composition and adjust bets accordingly.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Target className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-green-400 mb-2">Table Selection</h4>
                      <p className="text-green-300 text-sm">
                        Choose tables with favorable rules: 3:2 blackjack payout, dealer stands on soft 17, 
                        and fewer decks used. These rules significantly impact your long-term expected value.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-900/20 border-green-800/50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-green-400 mb-2">Emotional Control</h4>
                      <p className="text-green-300 text-sm">
                        Never chase losses or play when emotional. Stick to your strategy regardless of 
                        short-term outcomes. Blackjack is a marathon, not a sprint.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Practice Mode</h4>
              <p className="text-yellow-300 text-sm">
                Use our practice mode to master basic strategy before playing with real Gobog Coins. 
                Practice builds confidence and helps you make optimal decisions under pressure.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-black border-green-900/30 sticky top-24">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Guide Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? "default" : "ghost"}
                      className={`w-full justify-start gap-2 rounded-none ${
                        activeSection === section.id 
                          ? 'bg-green-600 text-black hover:bg-green-500' 
                          : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                      }`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                    </Button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card className="bg-black border-green-900/30">
            <CardContent className="p-6">
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}